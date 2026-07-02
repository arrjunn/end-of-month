// Food MCP client.
// Phase 1: returns mock data shaped like the real Swiggy Food MCP responses.
// Phase 3: each function will become a `client.callTool({ name, arguments })`
//          against `mcp.swiggy.com/food` via Vercel AI SDK's experimental_createMCPClient.

import type { City, Restaurant, MenuItem, Coupon, Diet } from "./types";
import { RESTAURANTS, MENU_ITEMS, COUPONS } from "./mock-data";

/** Swiggy's per-order platform fee — ₹17.58 as of Mar 2026, rounded. */
export const PLATFORM_FEE = 18;

export interface OrderCost {
  item_price: number;
  delivery_fee: number;
  platform_fee: number;
  coupon?: Coupon;
  discount: number;
  /** What the order actually charges: item + delivery + platform − coupon. */
  landed: number;
}

export const foodMCP = {
  /** Tool: search_restaurants
   *  v0 note: fixtures are Bangalore-only. We return them for any city —
   *  Phase 3's real Swiggy API will return city-correct data. */
  async searchRestaurants(args: { city: City; query?: string }): Promise<Restaurant[]> {
    void args; // city filter is a no-op until real MCP transport
    return RESTAURANTS;
  },

  /** Tool: search_menu — finds cheap items meeting a price ceiling and diet */
  async searchMenu(args: {
    city: City;
    diet: Diet;
    max_price: number;
    min_calories?: number;
  }): Promise<MenuItem[]> {
    return MENU_ITEMS.filter((m) => {
      if (m.price > args.max_price) return false;
      if (args.diet === "veg" && !m.is_veg) return false;
      if (args.min_calories && m.calories < args.min_calories) return false;
      return true;
    }).sort((a, b) => a.price - b.price);
  },

  /** Tool: fetch_food_coupons */
  async fetchCoupons(): Promise<Coupon[]> {
    return COUPONS;
  },

  /** Helper: landed cost for an order — item + delivery + platform fee − best
   *  applicable coupon. Menu price alone understates the bill (roadmap P0 #3). */
  computeOrderCost(item: MenuItem): OrderCost {
    const restaurant = RESTAURANTS.find((r) => r.id === item.restaurant_id)!;
    const subtotal = item.price + restaurant.delivery_fee + PLATFORM_FEE;

    let bestDiscount = 0;
    let bestCoupon: Coupon | undefined;
    for (const coupon of COUPONS) {
      if (item.price < coupon.min_order) continue;
      const discount = coupon.flat_discount ?? Math.round(item.price * (coupon.percent_discount! / 100));
      if (discount > bestDiscount) {
        bestDiscount = discount;
        bestCoupon = coupon;
      }
    }

    return {
      item_price: item.price,
      delivery_fee: restaurant.delivery_fee,
      platform_fee: PLATFORM_FEE,
      coupon: bestCoupon,
      discount: bestDiscount,
      landed: subtotal - bestDiscount,
    };
  },
};
