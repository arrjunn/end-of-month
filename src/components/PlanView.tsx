import type { Plan, DayPlan, DayType } from "@/lib/plan/types";
import { useStoreValue, writeStore, PANTRY_KEY, EMPTY_STRINGS } from "@/lib/store";
import { PanIcon, BikeIcon, DineIcon, BasketIcon, TagIcon } from "./icons";

interface Props {
  plan: Plan;
}

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

export function PlanView({ plan }: Props) {
  const pct = Math.min(100, Math.round((plan.total_cost / plan.input.budget) * 100));
  const remaining = plan.input.budget - plan.total_cost;
  const pace =
    pct <= 85
      ? "var(--rating-green)"
      : pct <= 100
        ? "var(--accent)"
        : "var(--discount-red)";

  return (
    <section>
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
                isToday={i === (new Date().getDay() + 6) % 7}
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

      {/* ── Annexes ── */}
      <div className="mt-6 space-y-3">
        {plan.savings_tips.length > 0 && <SaveMore tips={plan.savings_tips} />}
        {plan.recipes.length > 0 && <Recipes plan={plan} />}
        <Cart plan={plan} />
        {plan.dineout_booking && <Booking plan={plan} />}
      </div>
    </section>
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
