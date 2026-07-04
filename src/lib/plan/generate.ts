// Deterministic planner — Phase 1.
// Replaced by the Groq + Llama 3.3 agent loop in Phase 2; same shape.
//
// Stages:
//   1. Pick one Dineout happy-hour slot (if budget+days allow)
//   2. Pick N Food order days by landed cost (item + delivery + platform
//      fee − coupon), under spend caps, with variety scoring
//   3. Fill the rest with cook days backed by an Instamart staple cart
//   4. Match recipes from the cart to the user's profile + meal-times
//
// Roadmap P0 features live here: #2 spend caps (weekly + per-order, hard
// constraints), #3 landed-cost ranking, #4 decision receipts (`why` per
// day), #7 variety/fatigue scoring (no cuisine repeats, morale meal late).

import { foodMCP } from "@/lib/mcp/food";
import { instamartMCP } from "@/lib/mcp/instamart";
import { dineoutMCP } from "@/lib/mcp/dineout";
import { RECIPES, DINEOUT_RESTAURANTS } from "@/lib/mcp/mock-data";
import { haversineKm, estimateTravelMinutes } from "@/lib/location";
import type {
  Plan,
  PlanInput,
  DayPlan,
  DayType,
  FoodOrderLine,
  DineoutBooking,
  RecipeForCart,
} from "./types";
import type { MealTime, MenuItem, Recipe } from "@/lib/mcp/types";
import type { OrderCost } from "@/lib/mcp/food";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export async function generatePlan(input: PlanInput): Promise<Plan> {
  const days = Math.min(7, Math.max(2, input.days));

  // ── 0. Decide day-type counts ────────────────────────────────
  // Templates reshape the mix over the same planner: exam = delivery
  // heavy with no night out, guests = one splurge dineout on a raised
  // cap, recovery = nearly all cook days.
  const template = input.template;
  let dineoutDays = days >= 4 ? 1 : 0;
  let dineoutCapFraction = 0.4;
  if (template === "exam" || template === "recovery") dineoutDays = 0;
  if (template === "guests") {
    dineoutDays = days >= 2 ? 1 : 0;
    dineoutCapFraction = 0.5;
  }
  const remainingDays = days - dineoutDays;
  let orderDays = Math.max(1, Math.round(remainingDays * 0.3));
  if (template === "exam") orderDays = Math.max(1, Math.round(remainingDays * 0.6));
  if (template === "recovery") orderDays = 1;

  // ── 0.5 Payday awareness ─────────────────────────────────────
  // v0 simplification: plan Day 1 is treated as today for payday math.
  let daysToPayday: number | undefined;
  if (input.payday_day) {
    const now = new Date();
    const today = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    daysToPayday =
      input.payday_day > today
        ? input.payday_day - today
        : input.payday_day - today + daysInMonth;
  }
  const paydayInPlan = daysToPayday != null && daysToPayday < days;

  // ── 1. Dineout slot (target: ≤ cap fraction of budget) ───────
  // The per-order cap applies to the booking too — it's a hard constraint.
  const fortyPercentCap = Math.round(input.budget * dineoutCapFraction);
  const dineoutBudgetCap = Math.min(fortyPercentCap, input.max_per_order ?? Infinity);
  let dineoutBooking: DineoutBooking | undefined;
  let dineoutCost = 0;
  let dineoutDayIdx: number | undefined;
  let dineoutWhy: string | undefined;

  if (dineoutDays > 0) {
    const happyHourRestaurants = await dineoutMCP.searchRestaurants({
      city: input.city,
      happy_hour_only: true,
    });

    for (const r of happyHourRestaurants) {
      const slots = await dineoutMCP.getAvailableSlots({
        restaurant_id: r.id,
        max_price_per_person: dineoutBudgetCap,
      });
      const best = dineoutMCP.pickBestSlotUnderBudget(slots, dineoutBudgetCap);
      if (best) {
        const restaurantFull = DINEOUT_RESTAURANTS.find((d) => d.id === r.id);
        // Middle-ish day; when payday falls inside the plan, push the
        // night out to on or after it so the splurge lands on a full account.
        dineoutDayIdx = Math.floor(days / 2);
        if (paydayInPlan && daysToPayday != null) {
          dineoutDayIdx = Math.min(days - 1, Math.max(dineoutDayIdx, daysToPayday));
        }
        dineoutBooking = {
          day: dineoutDayIdx + 1,
          restaurant: r.name,
          area: restaurantFull?.area ?? "",
          slot: `${WEEKDAYS[dineoutDayIdx]} ${best.start_time}-${best.end_time}`,
          discount_percent: best.discount_percent,
          per_person_cost: best.cost_per_person_after_discount,
          travel_minutes:
            input.coords && restaurantFull
              ? estimateTravelMinutes(haversineKm(input.coords, restaurantFull.coords))
              : undefined,
        };
        dineoutCost = best.cost_per_person_after_discount;
        dineoutWhy = `${best.discount_percent}% happy-hour slot at ₹${best.cost_per_person_after_discount}/person, under the ₹${dineoutBudgetCap} dineout cap${
          dineoutBudgetCap === fortyPercentCap
            ? ` (${Math.round(dineoutCapFraction * 100)}% of weekly budget)`
            : " (your per-order cap)"
        }.`;
        break;
      }
    }
  }

  // ── 2. Food order items — landed-cost optimizer ──────────────
  // Rank by what the order actually charges (item + delivery + platform
  // fee − coupon), not menu price. A ₹95 dish that lands at ₹160 loses
  // to a ₹110 dish that lands at ₹120.
  const orderCandidates = await foodMCP.searchMenu({
    city: input.city,
    diet: input.diet,
    max_price: 200,
  });
  const restaurants = await foodMCP.searchRestaurants({ city: input.city });

  const ranked: { item: MenuItem; cost: OrderCost }[] = orderCandidates
    .map((item) => ({ item, cost: foodMCP.computeOrderCost(item) }))
    .filter(({ cost }) => input.max_per_order == null || cost.landed <= input.max_per_order)
    .sort((a, b) => a.cost.landed - b.cost.landed);

  // Place order days roughly evenly, skipping the dineout day
  const orderDayIdxs: number[] = [];
  for (let i = 1; i <= orderDays; i++) {
    const candidate = Math.round((i * days) / (orderDays + 1));
    const idx = candidate === dineoutDayIdx ? candidate + 1 : candidate;
    if (idx < days && !orderDayIdxs.includes(idx) && idx !== dineoutDayIdx) {
      orderDayIdxs.push(idx);
    }
  }

  // Variety scoring: never repeat a restaurant; avoid repeating a cuisine
  // while alternatives exist. Track what got skipped so the receipt can
  // show the trade-off.
  const picks: { item: MenuItem; cost: OrderCost; varietyNote?: string }[] = [];
  const usedRestaurants = new Set<string>();
  const usedCuisines = new Set<string>();
  let pendingSkipNote: string | undefined;

  for (const candidate of ranked) {
    if (picks.length >= orderDayIdxs.length) break;
    if (usedRestaurants.has(candidate.item.restaurant_id)) continue;
    const cuisine = restaurants.find((r) => r.id === candidate.item.restaurant_id)?.cuisines[0];
    if (cuisine && usedCuisines.has(cuisine)) {
      pendingSkipNote = `Skipped ${candidate.item.name} (₹${candidate.cost.landed} landed) since ${cuisine} is already on the plan.`;
      continue;
    }
    picks.push({ ...candidate, varietyNote: pendingSkipNote });
    pendingSkipNote = undefined;
    usedRestaurants.add(candidate.item.restaurant_id);
    if (cuisine) usedCuisines.add(cuisine);
  }
  // Cuisine rule is soft: if it left order slots empty, fill them anyway
  for (const candidate of ranked) {
    if (picks.length >= orderDayIdxs.length) break;
    if (usedRestaurants.has(candidate.item.restaurant_id)) continue;
    picks.push(candidate);
    usedRestaurants.add(candidate.item.restaurant_id);
  }

  // Fatigue weighting: cheapest order early-week, best meal late-week
  // when willpower is lowest.
  picks.sort((a, b) => a.cost.landed - b.cost.landed);

  const foodOrders: FoodOrderLine[] = [];
  const orderWhys = new Map<number, string>();
  const savingsTips: string[] = [];
  let orderTotalCost = 0;
  let orderDeliveryFees = 0;
  let runningTotal = dineoutCost;

  for (let i = 0; i < orderDayIdxs.length && i < picks.length; i++) {
    const { item, cost, varietyNote } = picks[i];
    // Weekly cap is hard: an order that busts it turns into a cook day
    if (runningTotal + cost.landed > input.budget) continue;

    const dayNum = orderDayIdxs[i] + 1;
    const restaurantName = restaurants.find((r) => r.id === item.restaurant_id)?.name ?? "";
    foodOrders.push({
      day: dayNum,
      restaurant: restaurantName,
      item: item.name,
      coupon_code: cost.coupon?.code,
      final_cost: cost.landed,
    });
    orderTotalCost += cost.landed;
    orderDeliveryFees += cost.delivery_fee;
    runningTotal += cost.landed;

    if (cost.coupon) {
      savingsTips.push(
        `Apply ${cost.coupon.code} at checkout on Day ${dayNum} (${item.name} from ${restaurantName}). It knocks ₹${cost.discount} off and is already priced into the plan.`,
      );
    }

    const rank = ranked.findIndex((r) => r.item.id === item.id) + 1;
    const breakdown = `₹${cost.item_price} + ₹${cost.delivery_fee} delivery + ₹${cost.platform_fee} platform${
      cost.coupon ? ` − ₹${cost.discount} ${cost.coupon.code}` : ""
    }`;
    let why = `Lands at ₹${cost.landed} (${breakdown}). Ranked #${rank} of ${ranked.length} by landed cost, not menu price.`;
    if (varietyNote) why += ` ${varietyNote}`;
    orderWhys.set(dayNum, why);
  }

  // ── 3. Instamart cart for cook days ──────────────────────────
  const actualCookDays = days - (dineoutBooking ? 1 : 0) - foodOrders.length;
  const cookBudget = Math.max(0, input.budget - dineoutCost - orderTotalCost);
  const cart = instamartMCP.buildWeeklyCart({
    cookDays: actualCookDays,
    budget: cookBudget,
    diet: input.diet,
    ownedSkus: input.pantry_skus,
  });

  // ── 4. Stitch the schedule ───────────────────────────────────
  const schedule: DayPlan[] = [];
  // Recipes can cook from the cart plus whatever the pantry already holds
  const cartSkus = new Set([...cart.lines.map((l) => l.sku), ...(input.pantry_skus ?? [])]);
  const perMealCost = cart.serves > 0 ? Math.round(cart.total / cart.serves) : 0;

  for (let i = 0; i < days; i++) {
    const weekday = WEEKDAYS[i];
    const dayNum = i + 1;

    if (i === dineoutDayIdx && dineoutBooking) {
      schedule.push({
        day: dayNum,
        weekday,
        type: "dineout",
        description: `${dineoutBooking.restaurant} (${dineoutBooking.discount_percent}% off, happy hour)`,
        cost: dineoutBooking.per_person_cost,
        source: "Dineout",
        why: dineoutWhy,
        meta: dineoutBooking.travel_minutes
          ? { slot: dineoutBooking.slot, travel: `${dineoutBooking.travel_minutes} min away` }
          : { slot: dineoutBooking.slot },
      });
      continue;
    }

    const order = foodOrders.find((o) => o.day === dayNum);
    if (order) {
      schedule.push({
        day: dayNum,
        weekday,
        type: "order",
        description: `${order.item} from ${order.restaurant}`,
        cost: order.final_cost,
        source: "Food",
        why: orderWhys.get(dayNum),
        meta: order.coupon_code ? { coupon: order.coupon_code } : undefined,
      });
      continue;
    }

    // Cook day — first cook day pays for the cart, rest free
    const isFirstCookDay = !schedule.some((d) => d.type === "cook");
    schedule.push({
      day: dayNum,
      weekday,
      type: "cook" as DayType,
      description: isFirstCookDay
        ? "Cook with Instamart staples"
        : "Leftovers / next batch from cart",
      cost: isFirstCookDay ? cart.total : 0,
      source: "Instamart",
      why:
        isFirstCookDay && (cart.lines.length > 0 || cart.pantrySaved > 0)
          ? `₹${cart.total} cart covers ~${cart.serves} meals (≈₹${perMealCost}/meal). No delivery or platform fees on cook days.${
              cart.pantrySaved > 0
                ? ` Your pantry covered ₹${cart.pantrySaved} of staples.`
                : ""
            }`
          : undefined,
    });
  }

  // ── 5. Pick recipes for the cart based on profile ────────────
  const recipes: RecipeForCart[] = [];
  const seenMealTimes = new Set<MealTime>();
  const candidateRecipes: Recipe[] = RECIPES.filter((r) => r.profiles.includes(input.profile));

  // Sort: filling recipes first, then by minimum prep time
  candidateRecipes.sort((a, b) => {
    if (a.filling !== b.filling) return a.filling ? -1 : 1;
    return a.prep_minutes - b.prep_minutes;
  });

  for (const recipe of candidateRecipes) {
    if (recipes.length >= 4) break;
    const usesSkus = recipe.required_skus.filter((sku) => cartSkus.has(sku));
    // Need at least half the required SKUs available in cart
    if (usesSkus.length < Math.ceil(recipe.required_skus.length / 2)) continue;
    // Variety: prefer not stacking same meal-time
    if (seenMealTimes.has(recipe.meal_time) && recipes.length > 1) continue;

    recipes.push({ recipe, meal_time: recipe.meal_time, uses_skus: usesSkus });
    seenMealTimes.add(recipe.meal_time);
  }

  const totalCost = schedule.reduce((sum, d) => sum + d.cost, 0);

  // ── 6. Save-more tips grounded in this plan's picks ──────────
  if (dineoutBooking) {
    savingsTips.push(
      `Pay the bill through the Swiggy Dineout app at ${dineoutBooking.restaurant}. That is what locks the ${dineoutBooking.discount_percent}% happy-hour rate; paying cash at the counter usually forfeits it.`,
    );
  }
  if (cart.lines.length > 1) {
    savingsTips.push(
      `Order the full Instamart cart (${cart.lines.length} items) in one go. One delivery for the week is cheaper than ${cart.lines.length} top-up runs.`,
    );
  }
  if (orderDeliveryFees > 0) {
    savingsTips.push(
      `On Swiggy One? Delivery fees on the order days total ₹${orderDeliveryFees}. Membership zeroes them and brings the week to ₹${totalCost - orderDeliveryFees}.`,
    );
  }
  if (cart.pantrySaved > 0) {
    savingsTips.push(
      `Your pantry covered ₹${cart.pantrySaved} of staples this week. Mark what's left again next time and the cart keeps shrinking.`,
    );
  }
  if (template) {
    const templateNote = {
      exam: "Exam week mix: delivery heavy on purpose. Coupons and landed-cost ranking keep it survivable.",
      guests: `Guests week: the dineout cap is raised to ${Math.round(dineoutCapFraction * 100)}% of the budget for one good table.`,
      recovery: "Recovery week: nearly all cook days. The single order day is the pressure valve.",
    }[template];
    savingsTips.push(templateNote);
  }
  if (daysToPayday != null) {
    savingsTips.push(
      paydayInPlan
        ? `Payday lands on day ${daysToPayday + 1} of this plan. The tight days come first and the night out sits after the account refills.`
        : `Payday is ${daysToPayday} days away, after this plan ends. What this plan saves is runway until then.`,
    );
  }

  return {
    input: { ...input, days },
    days: schedule,
    total_cost: totalCost,
    instamart_cart: {
      lines: cart.lines,
      total: cart.total,
      serves_meals: cart.serves,
      pantry_saved: cart.pantrySaved,
    },
    food_orders: foodOrders,
    dineout_booking: dineoutBooking,
    recipes,
    savings_tips: savingsTips,
    generated_by: "deterministic",
  };
}
