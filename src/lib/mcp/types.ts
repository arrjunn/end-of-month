// Types modeling the Swiggy MCP tool surface.
// Only the planning-subset of the 35 published tools is typed here —
// write/order tools are added in Phase 3 when real OAuth lands.

/** Free-form Indian city name. The combobox lets users pick from a curated
 *  list (~80 cities) but also accepts arbitrary text — Swiggy serves 600+
 *  cities so we shouldn't gate on a fixed enum. */
export type City = string;
export type Diet = "veg" | "non-veg" | "vegan";
export type Profile = "hostel" | "working" | "family";
export type MealTime = "breakfast" | "lunch" | "dinner";

export interface Coords {
  lat: number;
  lng: number;
}

// ── Food server ──────────────────────────────────────────────

export interface Restaurant {
  id: string;
  name: string;
  city: City;
  cuisines: string[];
  rating: number;
  delivery_fee: number;
  avg_meal_price: number;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  price: number;
  is_veg: boolean;
  calories: number;
  tags: string[];
}

export interface Coupon {
  code: string;
  description: string;
  min_order: number;
  flat_discount?: number;
  percent_discount?: number;
  valid_until: string;
}

// ── Instamart server ─────────────────────────────────────────

export interface InstamartProduct {
  sku: string;
  name: string;
  price: number;
  unit: string;
  category: "staple" | "vegetable" | "dairy" | "spice" | "ready-to-cook";
  serves_meals: number;
}

export interface InstamartCartLine {
  sku: string;
  name: string;
  qty: number;
  price: number;
  subtotal: number;
}

// ── Dineout server ───────────────────────────────────────────

export interface DineoutRestaurant {
  id: string;
  name: string;
  city: City;
  cuisines: string[];
  rating: number;
  cost_for_two: number;
  has_happy_hour: boolean;
  coords: Coords;
  area: string; // e.g. "Indiranagar"
}

export interface DineoutSlot {
  restaurant_id: string;
  date: string; // ISO date
  start_time: string; // 24h "HH:MM"
  end_time: string;
  discount_percent: number;
  is_happy_hour: boolean;
  cost_per_person_after_discount: number;
}

// ── Recipes (Phase 1: small fixed dataset; Phase 2: Llama-generated) ───

export interface Recipe {
  id: string;
  name: string;
  meal_time: MealTime;
  /** Profiles this recipe works for. Hostel = kettle/microwave only. */
  profiles: Profile[];
  required_skus: string[]; // Instamart product SKUs needed
  prep_minutes: number;
  /** One-line description shown in the UI. */
  blurb: string;
  /** Whether it's filling enough to be a primary meal. */
  filling: boolean;
}
