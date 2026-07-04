import type {
  City,
  Diet,
  Profile,
  Coords,
  InstamartCartLine,
  Recipe,
  MealTime,
} from "@/lib/mcp/types";

export interface PlanInput {
  budget: number;
  diet: Diet;
  city: City;
  profile: Profile;
  /** Number of days the plan should cover. 3-7. */
  days: number;
  /** Hard per-transaction spend cap (roadmap P0 #2). No single order or
   *  booking can exceed this — enforced as a constraint, not a suggestion. */
  max_per_order?: number;
  /** SKUs the user already has (pantry lite, roadmap #8). The weekly cart
   *  skips these, which is why week 2 costs less than week 1. */
  pantry_skus?: string[];
  /** Day of month salary lands (roadmap #11). The planner places the
   *  night out after it when the plan spans payday. */
  payday_day?: number;
  /** Optional week template shaping the day mix. */
  template?: WeekTemplate;
  /** Optional user coords for travel-time chips on Dineout options. */
  coords?: Coords;
}

export type DayType = "cook" | "order" | "dineout";

/** Week templates (roadmap #20): presets over the same planner.
 *  exam = max delivery min effort, guests = one splurge night out,
 *  recovery = post-festival austerity. */
export type WeekTemplate = "exam" | "guests" | "recovery";

export interface DayPlan {
  day: number; // 1-based, capped to input.days
  weekday: string; // "Mon", "Tue", etc.
  type: DayType;
  description: string;
  cost: number;
  source?: string;
  /** Decision receipt (roadmap P0 #4) — one line of why this was picked. */
  why?: string;
  meta?: Record<string, string | number>;
}

export interface FoodOrderLine {
  day: number;
  restaurant: string;
  item: string;
  coupon_code?: string;
  final_cost: number;
}

export interface DineoutBooking {
  day: number;
  restaurant: string;
  area: string;
  slot: string;
  discount_percent: number;
  per_person_cost: number;
  travel_minutes?: number; // estimated from user coords if provided
}

export interface RecipeForCart {
  recipe: Recipe;
  meal_time: MealTime;
  /** SKUs in the cart that this recipe uses. */
  uses_skus: string[];
}

export interface Plan {
  input: PlanInput;
  days: DayPlan[];
  total_cost: number;
  instamart_cart: {
    lines: InstamartCartLine[];
    total: number;
    serves_meals: number;
    /** ₹ of staples the user's pantry covered this week. */
    pantry_saved: number;
  };
  food_orders: FoodOrderLine[];
  dineout_booking?: DineoutBooking;
  recipes: RecipeForCart[];
  /** Actionable "save more" tips grounded in this plan's actual picks:
   *  which coupon to apply where, paying via the Dineout app, membership math. */
  savings_tips: string[];
  generated_by: "deterministic" | "agent";
}
