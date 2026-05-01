// Dineout MCP client.
// Phase 1: returns mock data shaped like the real Swiggy Dineout MCP responses.
// Phase 3: each function will become a `client.callTool({ name, arguments })`
//          against `mcp.swiggy.com/dineout`.

import type { City, DineoutRestaurant, DineoutSlot } from "./types";
import { DINEOUT_RESTAURANTS, DINEOUT_SLOTS } from "./mock-data";

export const dineoutMCP = {
  /** Tool: search_restaurants_dineout
   *  v0 note: fixtures are Bangalore-only. City filter is a no-op here —
   *  Phase 3's real Swiggy Dineout API will return city-correct slots. */
  async searchRestaurants(args: { city: City; happy_hour_only?: boolean }): Promise<DineoutRestaurant[]> {
    void args.city;
    return DINEOUT_RESTAURANTS.filter((r) => {
      if (args.happy_hour_only && !r.has_happy_hour) return false;
      return true;
    });
  },

  /** Tool: get_available_slots — 7-day window */
  async getAvailableSlots(args: {
    restaurant_id?: string;
    max_price_per_person?: number;
  }): Promise<DineoutSlot[]> {
    return DINEOUT_SLOTS.filter((s) => {
      if (args.restaurant_id && s.restaurant_id !== args.restaurant_id) return false;
      if (args.max_price_per_person && s.cost_per_person_after_discount > args.max_price_per_person) return false;
      return true;
    }).sort((a, b) => a.cost_per_person_after_discount - b.cost_per_person_after_discount);
  },

  /** Helper: best happy-hour slot under budget */
  pickBestSlotUnderBudget(slots: DineoutSlot[], budget: number): DineoutSlot | undefined {
    return slots
      .filter((s) => s.cost_per_person_after_discount <= budget)
      .sort((a, b) => b.discount_percent - a.discount_percent)[0];
  },
};
