# End of Month

A week-long meal optimizer for the days when your bank account isn't.

**Live demo →** https://end-of-month.vercel.app/

It's the 24th. Rent cleared. You have ₹600 left for food until the 1st. Right now you doomscroll Swiggy looking for the cheapest biryani, panic-buy Maggi from Instamart, and miss every happy hour Dineout slot in your area. **End of Month** is one agent that reads your budget and plans the entire week across all three — cook days, order days, and the one cheap night out you've earned.

Built on Swiggy's MCP platform. Uses **Food**, **Instamart**, and **Dineout** APIs together — not as separate features, but as one decision.

---

## The problem this solves

Three apps, three pricing models, three planning horizons:

- **Swiggy Food** is good for now-hunger but you don't know which item across which restaurant gives you the best ₹/calorie at 9pm on a Tuesday.
- **Instamart** is cheaper per meal if you cook, but only if you build the cart right and don't end up with half an unused cabbage.
- **Dineout** has happy-hour slots that are genuinely cheaper than ordering in — but nobody opens the app proactively.

A human can optimize one of these in isolation. Optimizing all three together, against a fixed weekly budget, is exactly the kind of problem an agent should do for you.

---

## How it uses all three APIs

| Day type | API | What the agent does |
|---|---|---|
| Cook-at-home days | **Instamart** | Builds a single weekly grocery cart that fills gaps in what you already have, picks ingredients shared across multiple recipes to minimize waste, and stays under per-meal budget. |
| Order-in days | **Food** | Finds the cheapest item meeting your dietary + calorie target across nearby restaurants, factors in delivery fee + current discounts, and times it to coupon windows. |
| One night out | **Dineout** | Searches happy-hour and pre-book slots for the week, picks the one restaurant that fits the leftover budget after groceries + orders, and books it. |

The point is the **handoff between them**. If groceries come in ₹80 under, the agent upgrades a Food order. If a Dineout slot opens at 40% off, the agent drops a cook day and rebalances the cart. None of this works with one API. All of it works with three.

---

## User flow

```
Input:
  budget         ₹600
  diet           veg
  city           Bangalore
  week starts    Mon

Agent output:
  Mon  Cook   Dal-rice + sabzi      [Instamart cart: ₹140 → 3 meals]
  Tue  Cook   Same cart, leftovers  [₹0 incremental]
  Wed  Order  Meals on Wheels       [Food: ₹95, 12% off coupon]
  Thu  Cook   Pasta                 [Instamart cart already covers]
  Fri  Dineout Truffles, 5-7pm slot [Dineout: ₹220, happy hour]
  Sat  Order  Curry leaf veg meal   [Food: ₹110]
  Sun  Cook   Use up remaining veg  [₹0 incremental]

  Total: ₹565 / ₹600
  Instamart cart link: [auto-filled]
  Food order links: [pre-staged]
  Dineout booking: [confirmed]
```

One screen. One plan. Three carts staged.

---

## Tech stack

**App**
- **Next.js 14** (App Router) — Server Actions drive the agent loop, RSC renders the plan
- **Tailwind + shadcn/ui** — UI
- **Vercel** — deploy in `bom1` (Mumbai) to sit next to Swiggy's `ap-south-1` region and keep the agent loop's per-tool-call RTT low

**Agent layer**
- **Groq running Llama 3.3 70B** — primary planner. Sub-second token throughput is the reason this works — a 7-day plan needs 10-15 tool calls across the three servers, and the user can't be staring at a spinner for 30s. Groq makes the loop feel interactive.
- **Vercel AI SDK** with `experimental_createMCPClient` — official MCP client, one instance per Swiggy server, tools surface directly into Llama's tool-calling format. Picked partly because Vercel AI SDK is on Swiggy's own list of recommended frameworks (alongside OpenAI Agents SDK, LangGraph, Mastra, CrewAI).
- **Zod** — typed envelope around every MCP tool response so the agent doesn't choke on schema drift.

**Swiggy MCP integration**
- Three **Streamable HTTP** endpoints: `mcp.swiggy.com/{food, instamart, dineout}`
- **OAuth 2.1 + PKCE (S256)**, JWT bearer — single token works across all three servers. Handled via Auth.js v5 with an encrypted session cookie.
- Operating budget: **120 req/min reads, 30 req/min writes** per user. A full weekly-plan generation fits inside ~25 reads + 3 writes, well under the cap with room for re-planning.
- Sharing a session across servers (per Swiggy's docs) is what makes the cross-API rebalancing in this app actually possible — auth once, plan everywhere.

---

## Architecture

```
  User input (budget, diet, city)
            │
            ▼
  Next.js Server Action
            │
            ▼
  Llama 3.3 70B on Groq  ◄──── tool definitions from 3 MCP clients
            │
            │  single agent loop — picks tools across all 3 servers
            ▼
  ┌────────────┬───────────────┬────────────┐
  │  Food MCP  │ Instamart MCP │ Dineout MCP│
  └────────────┴───────────────┴────────────┘
            │
            ▼
  7-day plan: cart links + staged orders + booking confirmation
```

**The one decision worth flagging:** one agent loop, three MCP clients — not three sequential agents handing off to each other. Llama sees all 35 tools (14 Food + 13 Instamart + 8 Dineout) at once and chooses across them per turn. That's what lets the agent do things like "groceries came in ₹80 under, so swap Wednesday's cook day for a Food order" inside a single planning pass instead of three round-trips. The shared OAuth session across servers is what makes this safe to do without re-authing mid-loop.

---

## Roadmap

**v0 — what this repo will be at submission**
- Scaffolded Next.js app with the 3 MCP integration points stubbed
- Agent prompt + planning logic written against mock responses
- UI for budget input + 7-day plan output

**v1 — once API keys land**
- Wire real Food / Instamart / Dineout calls
- Cart auto-fill via Instamart deeplink
- Order pre-stage via Food deeplink
- Dineout slot search + booking
- City-aware (start: Bangalore)

**v2 — stretch**
- "Pantry mode" — agent remembers what's left from last week's Instamart cart and plans around it
- Coupon-aware re-planning when Food drops a new offer mid-week
- Group mode — split a week's plan across 2-3 flatmates with shared groceries

---

## Why this needs MCP access (not scraping, not mock data)

The whole product is the cross-API arbitrage. Without live Food prices, the order-in math is fiction. Without live Instamart inventory, the cart fails on checkout. Without live Dineout slots, the booking is a screenshot. There is no version of this app that works on mock data — which is also why no one has built it yet.

---

## Why I'm building this

I'm an end-of-month person. Most of urban India is. The first time I checked my Swiggy spend across a month I genuinely flinched. The fix isn't "spend less" — it's "spend the same amount, smarter, without thinking about it." That's an agent problem, not a willpower problem.

---

## Status

Pre-API-key. v0 is **live at https://end-of-month.vercel.app/** running on a mocked MCP layer that's typed against the 35 published Swiggy tool names — the swap to real endpoints is a one-file change per server once Builders Club approves access.

Contact: see Builders Club application.
