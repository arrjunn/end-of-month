// Instamart MCP client.
// Phase 1: returns mock data shaped like the real Swiggy Instamart MCP responses.
// Phase 3: each function will become a `client.callTool({ name, arguments })`
//          against `mcp.swiggy.com/instamart`.

import type { Diet, InstamartProduct, InstamartCartLine } from "./types";
import { INSTAMART_PRODUCTS } from "./mock-data";

export const instamartMCP = {
  /** Tool: search_products */
  async searchProducts(args: { query?: string; category?: InstamartProduct["category"] }): Promise<InstamartProduct[]> {
    return INSTAMART_PRODUCTS.filter((p) => {
      if (args.category && p.category !== args.category) return false;
      if (args.query && !p.name.toLowerCase().includes(args.query.toLowerCase())) return false;
      return true;
    });
  },

  /** Tool: your_go_to_items — frequent reorder suggestions */
  async yourGoToItems(): Promise<InstamartProduct[]> {
    const goToSkus = new Set(["im_atta_5kg", "im_toor_dal_1kg", "im_onion_1kg", "im_oil_1l"]);
    return INSTAMART_PRODUCTS.filter((p) => goToSkus.has(p.sku));
  },

  /**
   * Helper: build a weekly grocery cart sized for `cookDays` cook-at-home days
   * within `budget`. Picks items that share ingredients across recipes to
   * minimize waste (rice + dal + onion + tomato is the staple base).
   * SKUs already in the user's pantry are skipped and their price counted
   * as pantry savings.
   */
  buildWeeklyCart(args: {
    cookDays: number;
    budget: number;
    diet: Diet;
    ownedSkus?: string[];
  }): {
    lines: InstamartCartLine[];
    total: number;
    serves: number;
    pantrySaved: number;
  } {
    const baseSkus = ["im_toor_dal_1kg", "im_onion_1kg", "im_tomato_500g", "im_potato_1kg", "im_oil_1l", "im_curd_400g"];
    const owned = new Set(args.ownedSkus ?? []);
    const lines: InstamartCartLine[] = [];
    let total = 0;
    let serves = 0;
    let pantrySaved = 0;

    for (const sku of baseSkus) {
      const product = INSTAMART_PRODUCTS.find((p) => p.sku === sku);
      if (!product) continue;
      if (owned.has(sku)) {
        // Pantry covers it: the recipes still work, the cart gets cheaper.
        pantrySaved += product.price;
        serves += product.serves_meals;
        continue;
      }
      if (total + product.price > args.budget) continue;
      lines.push({ sku, name: product.name, qty: 1, price: product.price, subtotal: product.price });
      total += product.price;
      serves += product.serves_meals;
    }

    if (serves < args.cookDays * 2 && total < args.budget) {
      const pasta = INSTAMART_PRODUCTS.find((p) => p.sku === "im_pasta_500g");
      if (pasta && !owned.has(pasta.sku) && total + pasta.price <= args.budget) {
        lines.push({ sku: pasta.sku, name: pasta.name, qty: 1, price: pasta.price, subtotal: pasta.price });
        total += pasta.price;
        serves += pasta.serves_meals;
      }
    }

    return { lines, total, serves, pantrySaved };
  },
};
