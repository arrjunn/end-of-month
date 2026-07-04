// Panic mode: it's 9:47pm and there is ₹85 left for today.
// Rank everything orderable right now by landed cost (same math as the
// weekly planner, no variety pass) and surface the top 3 under budget.
// If a staple cart beats them all on per-meal cost, say so honestly.

import { foodMCP } from "@/lib/mcp/food";
import { instamartMCP } from "@/lib/mcp/instamart";
import type { City, Diet } from "@/lib/mcp/types";

export interface PanicInput {
  /** What's left to spend today. */
  budget: number;
  diet: Diet;
  city: City;
}

export interface PanicOption {
  item: string;
  restaurant: string;
  landed: number;
  /** Cost breakdown, e.g. "₹95 + ₹19 delivery + ₹18 platform". */
  breakdown: string;
  coupon_code?: string;
  calories: number;
}

export interface PanicResult {
  budget: number;
  options: PanicOption[];
  /** Set when cooking from a staple cart beats every order on per-meal cost. */
  cook_fallback?: string;
}

export async function findPanicOptions(input: PanicInput): Promise<PanicResult> {
  const items = await foodMCP.searchMenu({
    city: input.city,
    diet: input.diet,
    max_price: input.budget,
  });
  const restaurants = await foodMCP.searchRestaurants({ city: input.city });

  const options: PanicOption[] = items
    .map((item) => ({ item, cost: foodMCP.computeOrderCost(item) }))
    .filter(({ cost }) => cost.landed <= input.budget)
    .sort((a, b) => a.cost.landed - b.cost.landed)
    .slice(0, 3)
    .map(({ item, cost }) => ({
      item: item.name,
      restaurant: restaurants.find((r) => r.id === item.restaurant_id)?.name ?? "",
      landed: cost.landed,
      breakdown: `₹${cost.item_price} + ₹${cost.delivery_fee} delivery + ₹${cost.platform_fee} platform${
        cost.coupon ? ` − ₹${cost.discount} ${cost.coupon.code}` : ""
      }`,
      coupon_code: cost.coupon?.code,
      calories: item.calories,
    }));

  // Honest alternative: a staple cart tonight, if it fits the budget
  // and beats the cheapest order on per-meal cost.
  const cart = instamartMCP.buildWeeklyCart({
    cookDays: 1,
    budget: input.budget,
    diet: input.diet,
  });
  let cook_fallback: string | undefined;
  if (cart.serves > 0 && cart.total <= input.budget) {
    const perMeal = Math.round(cart.total / cart.serves);
    const cheapestOrder = options[0]?.landed;
    if (cheapestOrder == null || perMeal < cheapestOrder) {
      cook_fallback = `Cooking wins tonight: ₹${cart.total} of Instamart staples covers ~${cart.serves} meals (≈₹${perMeal}/meal).`;
    }
  }

  return { budget: input.budget, options, cook_fallback };
}
