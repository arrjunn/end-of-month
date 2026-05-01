// Food MCP client.
// Phase 1: returns mock data shaped like the real Swiggy Food MCP responses.
// Phase 3: each function will become a `client.callTool({ name, arguments })`
//          against `mcp.swiggy.com/food` via Vercel AI SDK's experimental_createMCPClient.

import type { City, Restaurant, MenuItem, Coupon, Diet } from "./types";
import { RESTAURANTS, MENU_ITEMS, COUPONS } from "./mock-data";

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

  /** Helper: total cost for an order including delivery + best applicable coupon */
  computeOrderCost(item: MenuItem): { item_price: number; delivery_fee: number; coupon?: Coupon; final: number } {
    const restaurant = RESTAURANTS.find((r) => r.id === item.restaurant_id)!;
    const subtotal = item.price + restaurant.delivery_fee;

    let bestFinal = subtotal;
    let bestCoupon: Coupon | undefined;
    for (const coupon of COUPONS) {
      if (item.price < coupon.min_order) continue;
      const discount = coupon.flat_discount ?? Math.round(item.price * (coupon.percent_discount! / 100));
      const final = subtotal - discount;
      if (final < bestFinal) {
        bestFinal = final;
        bestCoupon = coupon;
      }
    }

    return {
      item_price: item.price,
      delivery_fee: restaurant.delivery_fee,
      coupon: bestCoupon,
      final: bestFinal,
    };
  },
};
