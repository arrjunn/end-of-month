# End of Month — Feature Strategy & Roadmap

**Product:** End of Month — a week-long meal optimizer on Swiggy MCP (Food + Instamart + Dineout)
**Author:** Arjun Varshney · **Version:** 0.2 · **Date:** July 2026
**Status:** Pre-API-key. v0 live on mocked MCP layer at end-of-month.vercel.app

---

## TL;DR

End of Month wins by being three things at once: (1) the most **trustworthy** consumer agent in the Swiggy ecosystem (spend caps, previews, receipts), (2) the only planner that optimizes **landed cost** (item + fees + minimums), and (3) a **retention machine** built on auto-pantry — because the #1 killer of meal-planning apps is manual logging fatigue. Everything below is filtered for feasibility against the 3 published Swiggy MCP servers and app-level logic only — no payment infra, no new hardware, no data we can't get.

**Positioning (sharpened):** not "spend less" — **"same money, better week."** The cheapest week is dal-rice ×7; nobody wants that week. We maximize variety and morale at a fixed budget, and we prove the math.

---

## 1. What the research says (and what it changes)

**Trust is the category bottleneck, not a nice-to-have.**
Swiggy's own MCP repo warns that agents can place *non-cancellable COD orders* on a user's behalf and tells users to review carts before checkout. Consumer studies on agentic commerce consistently find users adopt only when boundaries are clear: confirmation screens, kill switches, and visible logic. Payment networks (Mastercard Verifiable Intent, the Agentic Commerce Protocol) are converging on the same primitives — delegated consent, spend caps, per-action authorization.
→ *Change: trust features are P0, shipped before any real write path.*

**The delivery math is worse than users think — that's our wedge.**
India's average food-delivery ticket is ~₹220–230. Roughly 70% of orders carry zero delivery fee only because of Swiggy One / Zomato Gold subscriptions; platforms also add platform fees (~₹17.58/order as of Mar 2026) and restaurants list 15–30% above dine-in prices. Subscriptions create "guilt-spending" — ordering more to justify the membership.
→ *Change: the optimizer must reason about landed cost and membership economics, not menu prices.*

**Meal-planning apps die of logging fatigue, not lack of features.**
~70% of lifestyle-app users abandon within 100 days; meal-planning churn estimates exceed 60% by month three, and the cited cause is manual food/pantry logging becoming tedious. The standout retention feature across the category (e.g., Cooklist) is *automatic* pantry tracking from purchase history. Notifications help only up to a fine line — over-messaging drives uninstalls.
→ *Change: pantry mode is promoted from v2 stretch to the core retention loop, seeded automatically from Instamart order history. Notification budget: 2/week max.*

**Narrow positioning + habit loop beats feature depth.**
Retention research on consumer apps is blunt: "app for everyone" is the anti-pattern; winners pick a narrow user, a repeated win, and a low-effort loop (trigger → action → reward → investment).
→ *Change: our user is the urban Indian salary-cycle spender. Our loop is the Sunday plan + the 9pm panic button. Features that don't serve that loop get cut (see §5).*

**Swiggy's roadmap rewards contributors.**
Builders Club is explicitly building toward "Skills" — reusable agent capabilities — and an upcoming Builders Platform, with co-marketing for standout projects.
→ *Change: package our budget-allocation logic as a documented, reusable skill (P2), positioning us as an ecosystem contributor, not just an app.*

---

## 2. Prioritized feature set

Legend: **[v0.1]** = from first brainstorm, kept · **[NEW]** = added this round · Effort: S/M/L

### P0 — Trust & correctness (ship with API keys; blocks everything else)

| # | Feature | Effort | Origin |
|---|---------|--------|--------|
| 1 | Intent Preview | S | v0.1 |
| 2 | Spend caps | S | v0.1 |
| 3 | Landed-cost optimizer | M | v0.1 |
| 4 | Decision receipts | S | v0.1 |
| 5 | Prepaid-only writes | S | NEW |
| 6 | Undo window | S | v0.1 |
| 7 | Variety/fatigue scoring | S | v0.1 |

**1. Intent Preview.** Before any write, one card shows everything the agent is about to do and total cost, with three paths: *Proceed / Edit plan / I'll handle it*. One approval covers the week; nothing writes without it. (Pattern straight from current agentic-UX best practice.)

**2. Spend caps.** User sets a hard weekly cap and a per-transaction cap. Enforced in the agent loop as a constraint, not a suggestion — the agent *cannot* exceed them. App-level logic; zero payment-infra needed. This is the single screen that most de-risks us in Swiggy's review.

**3. Landed-cost optimizer.** Optimize on item + delivery fee + platform fee + MOV padding + surge, not menu price. A ₹95 dish that lands at ₹160 loses to a ₹110 dish that lands at ₹120. Also our answer to "why not just cook 7 days": we prove the order-in days are genuinely cheap *after* fees.

**4. Decision receipts.** One line of "why" per choice: *"Picked X over 3 cheaper listings — they had ₹40 delivery fees; this one's free above ₹99."* The reasoning already exists inside the loop; surfacing it is cheap and it's the highest trust-per-line-of-code feature we have.

**5. Prepaid-only writes.** [NEW] The agent never stages COD. Swiggy's own docs flag COD agent orders as non-cancellable risk; we design it out entirely. Also add a **session-conflict guard**: warn the user not to open the Swiggy app while a write is in flight (documented conflict source).

**6. Undo window.** 5-minute hold with visible countdown before any write executes. Belt-and-suspenders on top of #5.

**7. Variety/fatigue scoring.** Soft constraint: no protein/cuisine repeated >N times; weight morale meals late-week when willpower is lowest. This *is* the "same money, better week" promise, so it ships in P0, not later.

### P1 — The retention loop (weeks 2–8 after launch)

| # | Feature | Effort | Origin |
|---|---------|--------|--------|
| 8 | Pantry mode (auto-seeded) | M | v0.1, promoted |
| 9 | Mid-week re-plan button | M | v0.1 |
| 10 | Panic button | M | v0.1 |
| 11 | Salary-cycle awareness | S | v0.1 |
| 12 | Progressive autonomy ladder | M | NEW |
| 13 | Swiggy One optimizer | S | NEW |
| 14 | One-tap leftover check-in | S | NEW |
| 15 | Savings counter & streaks | S | v0.1 |

**8. Pantry mode.** Seed the pantry automatically from Instamart order history — zero manual entry, which is exactly the fatigue that kills competitor apps. Week 2's plan is cheaper than week 1's because the agent knows what's left. This is the moat *and* the retention story.

**9. Mid-week re-plan ("life happened" button).** One tap replans remaining days against remaining budget when plans change (invited out, veggies wilted). The visible payoff of the single-loop/three-clients architecture; also the best 30-second demo we have.

**10. Panic button.** 9:47pm, ₹85 left today: one tap finds the best landed-cost option near you *right now* and stages it. Weekly planning is a Sunday behavior; hunger is daily. This is the daily-active hook.

**11. Salary-cycle awareness.** Ask payday once. The agent tightens as the cycle ends, loosens after payday ("2 days to salary — here's a ₹180/day plan" / "payday week — batch-buy staples?"). Nobody else has a cash-flow-aware meal planner; trivially feasible (it's one date + a curve).

**12. Progressive autonomy ladder.** [NEW] Week 1: suggest-only. After N approved plans: act-with-confirmation. User can opt specific actions (e.g., grocery cart under ₹300) into full auto. Mirrors the suggest → confirm → autonomous pattern the agentic-UX literature recommends, and turns trust into a progression mechanic instead of a settings page.

**13. Swiggy One optimizer.** [NEW] Since ~70% of zero-fee orders ride on memberships, the agent should (a) factor membership benefits into landed cost if the user has Swiggy One, and (b) run the math on whether it *pays for itself* given the user's actual pattern — including calling out subscription guilt-spending. Pure arithmetic; high perceived intelligence.

**14. One-tap leftover check-in.** [NEW] Sunday night: "Did the pasta survive?" Yes/No/Half. One tap, not a food diary — keeps pantry accuracy without reintroducing the logging fatigue that churns users.

**15. Savings counter & streaks (light).** Persistent "₹1,240 saved since you started" + weeks-under-budget streak. Shareable, and our only organic growth loop at this stage. Deliberately light — no badges circus.

### P2 — Growth, ecosystem & stretch

| # | Feature | Effort | Origin |
|---|---------|--------|--------|
| 16 | Flatmate split-cart | M | v0.1 (scoped down) |
| 17 | Scheduled coupon-window orders | M | v0.1 |
| 18 | Skill packaging for Swiggy | M | v0.1 |
| 19 | Health floor nudge | S | v0.1 |
| 20 | Week templates | S | NEW |
| 21 | Staples price-drop watch | S | NEW |

**16. Flatmate split-cart.** Not full group planning — just two people sharing one Instamart cart with cost attribution. ~20% of the work of group mode for ~70% of the value; very PG/flat-share shaped.

**17. Scheduled coupon-window orders.** The agent doesn't just recommend timing — it schedules the write to fire when the discount window opens (inside the undo/caps framework). Genuinely agentic; no meal app does this.

**18. Skill packaging.** Publish "weekly budget allocation across Food/Instamart/Dineout" as a documented reusable skill in Swiggy's vocabulary. Ecosystem-contributor positioning; co-marketing candidate.

**19. Health floor nudge.** A floor, not a ceiling: gentle warning if a cheap week drops below a reasonable calorie/protein threshold. We're a budget app, not a diet app — one nudge, no tracking.

**20. Week templates.** [NEW] "Exam week" (max delivery, min effort), "Guests over" (one splurge meal), "Recovery week" (post-festival austerity). Prompt presets over the same planner — very low effort, high perceived personalization.

**21. Staples price-drop watch.** [NEW] Instamart staple prices move; agent re-checks a small watchlist and suggests topping up when atta/oil/rice dip. Read-only, fits comfortably in rate limits.

### UI principles (apply across all tiers — all from v0.1, kept)

- **The plan is a receipt, not a dashboard.** One vertical "week receipt," running total, done. Resist dashboard-itis.
- **Budget burn-down bar** pinned in the header (₹565/₹600, colored by pace). End-of-month users think in runway, not per-meal cost.
- **Drag-to-swap days** → agent replans live around the move. Direct manipulation makes the agent feel like a collaborator, not a black box.
- **"Flinch screen" onboarding.** First screen: estimated current monthly Swiggy spend vs. what a planned week costs. Emotional hook + instant value proof, before asking for anything.
- **Notification budget: 2/week.** Sunday plan nudge + payday nudge. Nothing else. (Over-messaging is a documented churn driver.)

---

## 3. Sequenced roadmap

| Release | Contents | Gate |
|---------|----------|------|
| **v1** (API keys land) | P0 #1–7 + week-receipt UI + flinch onboarding | Swiggy staging approval |
| **v1.5** (weeks 2–8) | P1 #8–15 | 25+ real users through ≥2 weekly cycles |
| **v2** | P2 #16–21 | Week-4 retention ≥ 30% |

---

## 4. Metrics that matter

**North star: Weekly Plans Completed Under Budget (WPCUB).**
Supporting: plan→approval rate (trust), mid-week replan usage (architecture payoff), week-2 and week-4 retention (loop health), avg ₹ saved vs. user's own baseline (value proof), write error/conflict rate (reliability), panic-button DAU (daily hook).

---

## 5. What we are deliberately NOT building (and why)

- **Full nutrition/macro tracking.** Different product, heavy logging burden — the exact fatigue that churns this category. The health *floor* (#19) is the whole concession.
- **Multi-platform aggregation (Zomato/Blinkit price comparison).** Swiggy's ground rules prohibit aggregation layers that obscure their brand and reselling MCP access. Strategic suicide inside their program; also doubles integration surface for marginal value.
- **Chat-first UI.** The job is a plan, not a conversation. Chat adds latency and ambiguity to a task that direct manipulation solves better.
- **Recipe database / content community.** Commodity feature, enormous content cost, zero moat for us.
- **In-app payments / wallet.** Stay out of money handling entirely; deeplink to Swiggy checkout. Regulatory + trust surface we don't need.
- **Full group planning in v1.** Split-cart (#16) first; multi-user preference merging is a v3 problem at best.
- **WhatsApp/voice bot.** Tempting for India, but it forks the product pre-PMF. Revisit only if web retention proves the loop.

---

## 6. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Non-cancellable orders / bad writes | Prepaid-only (#5), undo window (#6), spend caps (#2), intent preview (#1) |
| Session conflicts with the Swiggy app | In-flight write guard + user warning (#5) |
| Write rate limits (30/min) | Full weekly plan ≈ 3 writes today; scheduled orders queue through the same budget |
| Coupon/price volatility between plan and execution | Show totals as "estimated ±"; re-verify at write time; decision receipts explain deltas |
| Schema drift on Swiggy tools | Zod envelopes (already in stack) + contract tests against published schemas |
| Trust cold start | Progressive autonomy ladder (#12): agent earns write permission |
| Order-history access for pantry seeding | Confirm scope in staging; fallback = leftover check-ins (#14) + cart history we created ourselves |

---

## Appendix — key sources

- Swiggy Builders Club & MCP: mcp.swiggy.com/builders; Swiggy press release (Apr 2026); Swiggy/swiggy-mcp-server-manifest (GitHub) — COD & session warnings
- Agentic UX patterns: Smashing Magazine, "Designing for Agentic AI" (Feb 2026); Mastercard Verifiable Intent (Mar 2026); checkout.com on ACP spend caps; Bidease consumer survey on AI purchasing trust
- India delivery economics: Storyboard18 on Q2 FY26 (avg ticket ₹220–230; ~70% zero-fee via subscriptions); MenuManager 2026 fee breakdown (platform fee ₹17.58); Outlook Money on hidden charges; Spenrol on markup + subscription guilt-spending
- Retention: Iterable (70% lifestyle-app abandonment in 100 days); IntelMarketResearch NA meal-planning outlook (60%+ churn by month 3; logging fatigue); Fortune & FoodiePrep 2026 app reviews (pantry-awareness as the differentiator; Cooklist auto-tracking)
