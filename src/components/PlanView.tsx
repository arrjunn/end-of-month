"use client";

import { useRef, useState } from "react";
import type { Plan, DayPlan, DayType, WeekTemplate } from "@/lib/plan/types";
import { formatPlanText } from "@/lib/plan/share";
import { useStoreValue, writeStore, PANTRY_KEY, EMPTY_STRINGS } from "@/lib/store";
import { PanIcon, BikeIcon, DineIcon, BasketIcon, TagIcon } from "./icons";

interface Props {
  plan: Plan;
  /** Anchor budget for the what-if slider (the last submitted budget). */
  whatIfBase?: number | null;
  whatIfBusy?: boolean;
  onWhatIf?: (budget: number) => void;
  /** Mid-week re-plan: replan remaining days with the remaining budget. */
  onReplan?: (remainingBudget: number, fromDayIdx: number) => void;
}

const TEMPLATE_LABEL: Record<WeekTemplate, string> = {
  exam: "exam week",
  guests: "guests over",
  recovery: "recovery week",
};

const TYPE_META: Record<
  DayType,
  {
    label: string;
    chip: string;
    dot: string;
    Icon: typeof PanIcon;
  }
> = {
  cook: {
    label: "Cook",
    chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    Icon: PanIcon,
  },
  order: {
    label: "Order",
    chip: "bg-[var(--accent-soft)] text-[var(--accent)]",
    dot: "bg-[var(--accent-soft)] text-[var(--accent)]",
    Icon: BikeIcon,
  },
  dineout: {
    label: "Dineout",
    chip: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
    dot: "bg-purple-500/15 text-purple-600 dark:text-purple-300",
    Icon: DineIcon,
  },
};

export function PlanView({ plan, whatIfBase, whatIfBusy, onWhatIf, onReplan }: Props) {
  const pct = Math.min(100, Math.round((plan.total_cost / plan.input.budget) * 100));
  const remaining = plan.input.budget - plan.total_cost;
  const pace =
    pct <= 85
      ? "var(--rating-green)"
      : pct <= 100
        ? "var(--accent)"
        : "var(--discount-red)";

  return (
    <section className={`transition-opacity duration-200 ${whatIfBusy ? "opacity-60" : ""}`}>
      {/* ── The week receipt ── */}
      <div className="drop-shadow-[0_8px_24px_rgba(40,44,63,0.10)] dark:drop-shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
        <div className="receipt-edge-top" />
        <div className="bg-[var(--bg-elevated)] px-5 sm:px-8 py-6">
          {/* Header */}
          <div className="text-center border-b border-dashed border-[var(--border-strong)] pb-5">
            <div className="font-mono text-[11px] uppercase tracking-[0.35em] text-[var(--fg-faint)]">
              week receipt
            </div>
            <div className="font-display text-lg font-bold mt-1 capitalize">
              {plan.input.days}-day plan · {plan.input.profile}
            </div>
            <div className="text-xs text-[var(--fg-muted)] mt-0.5 capitalize">
              {plan.input.city} · {plan.input.diet}
              {plan.input.template ? ` · ${TEMPLATE_LABEL[plan.input.template]}` : ""}
              {plan.input.start_weekday ? " · mid-week replan" : ""}
            </div>

            {/* Budget burn-down */}
            <div className="mt-4 flex items-center gap-3">
              <span className="font-mono text-xs text-[var(--fg-muted)] tabular-nums">
                ₹0
              </span>
              <div className="flex-1 h-2 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: pace }}
                />
              </div>
              <span className="font-mono text-xs text-[var(--fg-muted)] tabular-nums">
                ₹{plan.input.budget}
              </span>
            </div>
            <div className="mt-2 flex justify-between text-xs">
              <span className="text-[var(--fg-muted)]">
                Caps enforced: ₹{plan.input.budget}/week
                {plan.input.max_per_order ? ` · ₹${plan.input.max_per_order}/order` : ""}
              </span>
              <span className="font-semibold" style={{ color: pace }}>
                {pct}% used
              </span>
            </div>

            {onWhatIf && whatIfBase != null && (
              <WhatIf
                key={plan.input.budget}
                base={whatIfBase}
                current={plan.input.budget}
                onChange={onWhatIf}
              />
            )}
          </div>

          {/* Day rows on a timeline rail. Plans start Monday, so today's
              weekday index marks the current row when the plan covers it. */}
          <ul className="pt-2">
            {plan.days.map((d, i) => (
              <DayRow
                key={d.day}
                d={d}
                index={i}
                last={i === plan.days.length - 1}
                isToday={
                  ((plan.input.start_weekday ?? 0) + i) % 7 ===
                  (new Date().getDay() + 6) % 7
                }
              />
            ))}
          </ul>

          {/* Totals */}
          <div className="border-t border-dashed border-[var(--border-strong)] mt-2 pt-4 font-mono text-sm">
            <div className="flex justify-between items-baseline">
              <span className="uppercase tracking-widest text-xs text-[var(--fg-muted)]">
                Total
              </span>
              <span className="font-display text-2xl font-bold tabular-nums">
                ₹{plan.total_cost}
              </span>
            </div>
            <div className="flex justify-between items-baseline mt-1">
              <span className="uppercase tracking-widest text-xs text-[var(--fg-muted)]">
                Saved
              </span>
              <span
                className="font-semibold tabular-nums"
                style={{ color: "var(--rating-green)" }}
              >
                ₹{Math.max(0, remaining)}
              </span>
            </div>
          </div>

          {/* Barcode flourish */}
          <div className="mt-6 flex flex-col items-center gap-1.5 select-none" aria-hidden>
            <div className="flex items-end gap-[3px] h-8 opacity-70">
              {BARCODE.map((w, i) => (
                <div key={i} className="bg-[var(--fg)] h-full" style={{ width: w }} />
              ))}
            </div>
            <div className="font-mono text-[10px] tracking-[0.3em] text-[var(--fg-faint)]">
              {plan.generated_by === "agent" ? "LLAMA·3.3·70B·GROQ" : "PHASE·1·DETERMINISTIC"}
            </div>
          </div>
        </div>
        <div className="receipt-edge-bottom" />
      </div>

      {/* ── Actions ── */}
      <div className="mt-3 flex items-start justify-between gap-3">
        {onReplan ? <Replan plan={plan} onReplan={onReplan} /> : <span />}
        <ShareButton plan={plan} />
      </div>

      {/* ── Annexes ── */}
      <div className="mt-3 space-y-3">
        {plan.savings_tips.length > 0 && <SaveMore tips={plan.savings_tips} />}
        {plan.recipes.length > 0 && <Recipes plan={plan} />}
        <Cart plan={plan} />
        {plan.dineout_booking && <Booking plan={plan} />}
      </div>
    </section>
  );
}

/* ── Mid-week re-plan ─────────────────────────────────────────── */
// "Life happened": pick the day things changed and what's actually left;
// the agent replans just the remaining days.

function Replan({
  plan,
  onReplan,
}: {
  plan: Plan;
  onReplan: (remainingBudget: number, fromDayIdx: number) => void;
}) {
  const maxFrom = plan.input.days - 2; // at least 2 days must remain
  const start = plan.input.start_weekday ?? 0;
  const todayOffset = ((((new Date().getDay() + 6) % 7) - start) % 7 + 7) % 7;
  const defaultFrom = Math.min(Math.max(todayOffset, 1), Math.max(maxFrom, 1));
  const spentBefore = (idx: number) =>
    plan.days.slice(0, idx).reduce((s, d) => s + d.cost, 0);

  const [open, setOpen] = useState(false);
  const [fromIdx, setFromIdx] = useState(defaultFrom);
  const [amount, setAmount] = useState(
    Math.max(0, plan.input.budget - spentBefore(defaultFrom)),
  );

  if (maxFrom < 1) return null;
  const remaining = plan.input.days - fromIdx;
  const valid = amount >= 100 && amount <= 10000;

  return (
    <div className="flex-1 min-w-0">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-semibold text-[var(--fg-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
      >
        Life happened? Replan
        <span className={`text-[9px] transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {open && (
        <div className="mt-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] shadow-[var(--shadow-card)] p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)] mb-1.5">
              Replan from
            </label>
            <select
              value={fromIdx}
              onChange={(e) => {
                const idx = Number(e.target.value);
                setFromIdx(idx);
                setAmount(Math.max(0, plan.input.budget - spentBefore(idx)));
              }}
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-2.5 py-2 text-sm outline-none focus:border-[var(--accent)] transition-colors"
            >
              {plan.days.slice(1, maxFrom + 1).map((d, j) => (
                <option key={d.day} value={j + 1}>
                  Day {d.day} · {d.weekday}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)] mb-1.5">
              Money actually left
            </label>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[var(--fg-muted)]">₹</span>
              <input
                type="number"
                min={100}
                max={10000}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="no-spinner font-mono font-semibold bg-transparent border-b-2 border-[var(--border)] focus:border-[var(--accent)] outline-none w-24 py-0.5 transition-colors tabular-nums"
              />
            </div>
            {!valid && (
              <p className="mt-1 text-xs text-[var(--discount-red)]">
                Enter between ₹100 and ₹10000.
              </p>
            )}
          </div>
          <button
            onClick={() => valid && onReplan(amount, fromIdx)}
            disabled={!valid}
            className="w-full py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            Replan {remaining} {remaining === 1 ? "day" : "days"} with ₹{amount}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Share ────────────────────────────────────────────────────── */

function ShareButton({ plan }: { plan: Plan }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const text = formatPlanText(plan);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "My week receipt", text });
        return;
      } catch {
        // user dismissed the sheet or share failed; fall through to copy
      }
    }
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      // async clipboard unavailable; fall back to a hidden textarea copy
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        ok = document.execCommand("copy");
      } finally {
        ta.remove();
      }
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      onClick={share}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-semibold text-[var(--fg-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
      </svg>
      {copied ? "Copied ✓" : "Share receipt"}
    </button>
  );
}

/* ── What-if slider ───────────────────────────────────────────── */
// Drag the budget and watch the week rebalance. Debounced so we only
// replan when the thumb settles; keyed on plan budget so it resyncs
// after each replan.

function WhatIf({
  base,
  current,
  onChange,
}: {
  base: number;
  current: number;
  onChange: (budget: number) => void;
}) {
  const [val, setVal] = useState(current);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const min = Math.max(200, Math.round((base * 0.6) / 10) * 10);
  const max = Math.min(10000, Math.round((base * 1.4) / 10) * 10);

  return (
    <div className="mt-4 text-left">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
          What if the budget were
        </span>
        <span className="font-mono text-sm font-bold tabular-nums text-[var(--accent)]">
          ₹{val}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={10}
        value={val}
        onChange={(e) => {
          const v = Number(e.target.value);
          setVal(v);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            if (v !== current) onChange(v);
          }, 350);
        }}
        className="w-full accent-[var(--accent)] cursor-pointer"
        aria-label="What-if budget"
      />
      <div className="flex justify-between text-[10px] text-[var(--fg-faint)] font-mono mt-0.5">
        <span>₹{min}</span>
        <span>₹{max}</span>
      </div>
    </div>
  );
}

/* ── Receipt rows ─────────────────────────────────────────────── */

function DayRow({
  d,
  index,
  last,
  isToday,
}: {
  d: DayPlan;
  index: number;
  last: boolean;
  isToday: boolean;
}) {
  const t = TYPE_META[d.type];
  return (
    <li
      className={`row-in grid grid-cols-[2.5rem_1fr_auto] gap-x-3 ${
        isToday ? "bg-[var(--accent-soft)] rounded-xl px-2 -mx-2 pt-2" : ""
      }`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Timeline rail */}
      <div className="flex flex-col items-center">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${t.dot}`}
        >
          <t.Icon className="w-4.5 h-4.5" />
        </div>
        {!last && <div className="w-px flex-1 bg-[var(--border)] my-1" />}
      </div>

      {/* Body */}
      <div className={`min-w-0 ${last ? "pb-1" : "pb-5"}`}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[11px] uppercase text-[var(--fg-faint)]">
            Day {d.day} · {d.weekday}
          </span>
          {isToday && (
            <span className="px-1.5 py-px rounded text-[10px] font-bold uppercase tracking-wide bg-[var(--accent)] text-white">
              Today
            </span>
          )}
          <span className={`px-1.5 py-px rounded text-[10px] font-bold uppercase tracking-wide ${t.chip}`}>
            {t.label}
          </span>
          {d.meta?.coupon && <span className="coupon-ticket">{d.meta.coupon}</span>}
          {d.meta?.travel && (
            <span className="text-[10px] px-1.5 py-px rounded bg-[var(--bg-subtle)] text-[var(--fg-muted)]">
              {d.meta.travel}
            </span>
          )}
        </div>
        <div className="text-sm font-medium mt-1">{d.description}</div>
        {d.meta?.slot && (
          <div className="text-xs text-[var(--fg-muted)] mt-0.5">{d.meta.slot}</div>
        )}
        {d.why && (
          <details className="mt-1 group">
            <summary className="text-[11px] font-semibold text-[var(--accent)] cursor-pointer select-none list-none inline-flex items-center gap-1">
              why?
              <span className="group-open:rotate-180 transition-transform text-[9px]">▾</span>
            </summary>
            <p className="text-xs text-[var(--fg-muted)] mt-1 leading-relaxed border-l-2 border-[var(--accent-soft)] pl-2">
              {d.why}
            </p>
          </details>
        )}
      </div>

      {/* Price */}
      <div className="text-right">
        <div className="font-mono font-semibold tabular-nums text-sm">
          {d.cost === 0 ? "—" : `₹${d.cost}`}
        </div>
        <div className="text-[10px] text-[var(--fg-faint)]">{d.source}</div>
      </div>
    </li>
  );
}

/* ── Annex cards ──────────────────────────────────────────────── */

function SaveMore({ tips }: { tips: string[] }) {
  return (
    <div className="rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-3">
        <span className="w-8 h-8 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center shrink-0">
          <TagIcon className="w-4.5 h-4.5" />
        </span>
        <div>
          <div className="text-sm font-semibold">Save more</div>
          <div className="text-xs text-[var(--fg-muted)]">
            how to execute this plan at the best price
          </div>
        </div>
      </div>
      <ul className="divide-y divide-[var(--border)]">
        {tips.map((tip, i) => (
          <li key={i} className="px-5 py-3 flex gap-3 items-start">
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
            <p className="text-xs sm:text-sm text-[var(--fg-muted)] leading-relaxed">
              {tip}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Recipes({ plan }: { plan: Plan }) {
  return (
    <div className="rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-3">
        <span className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
          <PanIcon className="w-4.5 h-4.5" />
        </span>
        <div>
          <div className="text-sm font-semibold">What to cook</div>
          <div className="text-xs text-[var(--fg-muted)]">
            from your cart · tuned for {plan.input.profile}
          </div>
        </div>
      </div>
      <ul className="divide-y divide-[var(--border)]">
        {plan.recipes.map(({ recipe, meal_time }) => (
          <li key={recipe.id} className="px-5 py-3 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-semibold">{recipe.name}</span>
                <span className="text-[10px] px-1.5 py-px rounded bg-[var(--bg-subtle)] text-[var(--fg-muted)] capitalize">
                  {meal_time}
                </span>
              </div>
              <div className="text-xs text-[var(--fg-muted)] line-clamp-1">
                {recipe.blurb}
              </div>
            </div>
            <div className="text-xs text-[var(--fg-muted)] whitespace-nowrap font-mono">
              {recipe.prep_minutes} min
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Cart({ plan }: { plan: Plan }) {
  const pantry = useStoreValue(PANTRY_KEY, EMPTY_STRINGS);
  const toggle = (sku: string) =>
    writeStore(
      PANTRY_KEY,
      pantry.includes(sku) ? pantry.filter((s) => s !== sku) : [...pantry, sku],
    );

  return (
    <details className="rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] overflow-hidden group">
      <summary className="px-5 py-4 cursor-pointer select-none flex items-center gap-3">
        <span className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
          <BasketIcon className="w-4.5 h-4.5" />
        </span>
        <div className="flex-1">
          <div className="text-sm font-semibold">Instamart cart</div>
          <div className="text-xs text-[var(--fg-muted)]">
            {plan.instamart_cart.lines.length} items · ₹{plan.instamart_cart.total} · ~
            {plan.instamart_cart.serves_meals} meals
            {plan.instamart_cart.pantry_saved > 0 &&
              ` · ₹${plan.instamart_cart.pantry_saved} from pantry`}
          </div>
        </div>
        <span className="text-[var(--fg-muted)] group-open:rotate-180 transition-transform">
          ▾
        </span>
      </summary>
      <div className="px-5 pb-4 border-t border-[var(--border)]">
        <p className="text-xs text-[var(--fg-muted)] pt-3">
          Mark staples you already have. The next plan skips them and the cart gets
          cheaper.
        </p>
        <ul className="divide-y divide-[var(--border)] text-sm">
          {plan.instamart_cart.lines.map((line) => {
            const owned = pantry.includes(line.sku);
            return (
              <li key={line.sku} className="py-2 flex items-center gap-3">
                <span className="flex-1 font-mono min-w-0 truncate">{line.name}</span>
                <span className="text-[var(--fg-muted)] tabular-nums font-mono">
                  ₹{line.price}
                </span>
                <button
                  onClick={() => toggle(line.sku)}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap ${
                    owned
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : "border border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  {owned ? "in pantry ✓" : "have it?"}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </details>
  );
}

function Booking({ plan }: { plan: Plan }) {
  const b = plan.dineout_booking!;
  return (
    <div className="rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] p-5">
      <div className="flex items-start gap-3 mb-4">
        <span className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
          <DineIcon className="w-4.5 h-4.5" />
        </span>
        <div className="flex-1">
          <div className="text-sm font-semibold">{b.restaurant}</div>
          <div className="text-xs text-[var(--fg-muted)]">{b.area}</div>
        </div>
        <span className="px-2 py-1 rounded-md bg-[var(--discount-red)]/10 text-[var(--discount-red)] text-xs font-bold">
          {b.discount_percent}% OFF
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm font-mono">
        <Stat label="When" value={b.slot} />
        <Stat label="Per person" value={`₹${b.per_person_cost}`} />
        <Stat label="Travel" value={b.travel_minutes != null ? `${b.travel_minutes} min` : "—"} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-[var(--fg-muted)] uppercase tracking-wide">
        {label}
      </div>
      <div className="text-sm mt-0.5">{value}</div>
    </div>
  );
}

/* Pseudo-random bar widths for the barcode flourish (stable, no Math.random
   so SSR and client render identically). */
const BARCODE = [2, 1, 3, 1, 2, 2, 1, 4, 1, 2, 3, 1, 1, 2, 4, 1, 2, 1, 3, 2, 1, 2, 1, 4, 2, 1, 3, 1, 2, 1];
