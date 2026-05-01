// Deterministic planner — Phase 1.
// Replaced by the Groq + Llama 3.3 agent loop in Phase 2; same shape.
//
// Stages:
//   1. Pick one Dineout happy-hour slot (if budget+days allow)
//   2. Pick N Food order days at the cheapest items meeting diet
//   3. Fill the rest with cook days backed by an Instamart staple cart
//   4. Match recipes from the cart to the user's profile + meal-times

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
import type { MealTime, Recipe } from "@/lib/mcp/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export async function generatePlan(input: PlanInput): Promise<Plan> {
  const days = Math.min(7, Math.max(2, input.days));

  // ── 0. Decide day-type counts ────────────────────────────────
  const dineoutDays = days >= 4 ? 1 : 0;
  const remainingDays = days - dineoutDays;
  const orderDays = Math.max(1, Math.round(remainingDays * 0.3));
  const cookDays = remainingDays - orderDays;

  // ── 1. Dineout slot (target: ≤40% of budget) ─────────────────
  const dineoutBudgetCap = Math.round(input.budget * 0.4);
  let dineoutBooking: DineoutBooking | undefined;
  let dineoutCost = 0;
  let dineoutDayIdx: number | undefined;

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
        dineoutDayIdx = Math.floor(days / 2); // middle-ish day (0-based)
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
        break;
      }
    }
  }

  // ── 2. Food order items ──────────────────────────────────────
  const orderCandidates = await foodMCP.searchMenu({
    city: input.city,
    diet: input.diet,
    max_price: 200,
  });

  const foodOrders: FoodOrderLine[] = [];
  let orderTotalCost = 0;

  // Place order days roughly evenly, skipping the dineout day
  const orderDayIdxs: number[] = [];
  for (let i = 1; i <= orderDays; i++) {
    const candidate = Math.round((i * days) / (orderDays + 1));
    const idx = candidate === dineoutDayIdx ? candidate + 1 : candidate;
    if (idx < days && !orderDayIdxs.includes(idx) && idx !== dineoutDayIdx) {
      orderDayIdxs.push(idx);
    }
  }

  const restaurants = await foodMCP.searchRestaurants({ city: input.city });
  for (let i = 0; i < orderDayIdxs.length && i < orderCandidates.length; i++) {
    const item = orderCandidates[i];
    const cost = foodMCP.computeOrderCost(item);
    const restaurantName = restaurants.find((r) => r.id === item.restaurant_id)?.name ?? "";
    foodOrders.push({
      day: orderDayIdxs[i] + 1,
      restaurant: restaurantName,
      item: item.name,
      coupon_code: cost.coupon?.code,
      final_cost: cost.final,
    });
    orderTotalCost += cost.final;
  }

  // ── 3. Instamart cart for cook days ──────────────────────────
  const cookBudget = Math.max(0, input.budget - dineoutCost - orderTotalCost);
  const cart = instamartMCP.buildWeeklyCart({
    cookDays,
    budget: cookBudget,
    diet: input.diet,
  });

  // ── 4. Stitch the schedule ───────────────────────────────────
  const schedule: DayPlan[] = [];
  const cartSkus = new Set(cart.lines.map((l) => l.sku));

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

  return {
    input: { ...input, days },
    days: schedule,
    total_cost: totalCost,
    instamart_cart: {
      lines: cart.lines,
      total: cart.total,
      serves_meals: cart.serves,
    },
    food_orders: foodOrders,
    dineout_booking: dineoutBooking,
    recipes,
    generated_by: "deterministic",
  };
}
