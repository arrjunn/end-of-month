"use client";

import { useEffect, useState } from "react";
import { TopNav } from "@/components/TopNav";
import { BudgetForm } from "@/components/BudgetForm";
import { PlanView } from "@/components/PlanView";
import { PanicPane } from "@/components/PanicPane";
import { BikeIcon, BasketIcon, DineIcon } from "@/components/icons";
import type { Plan, PlanInput } from "@/lib/plan/types";
import type { PanicInput, PanicResult } from "@/lib/plan/panic";
import {
  readStore,
  writeStore,
  useStoreValue,
  PANTRY_KEY,
  HISTORY_KEY,
  FLINCH_KEY,
  EMPTY_STRINGS,
  EMPTY_HISTORY,
  type HistoryEntry,
} from "@/lib/store";

export default function Home() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // After a plan lands, the form collapses to a summary chip on mobile so
  // the receipt owns the screen. Desktop always shows both panes.
  const [formCollapsed, setFormCollapsed] = useState(false);
  // Results pane shows the weekly plan or the panic finder. All panic
  // fetches run from event handlers here; PanicPane is presentational.
  const [mode, setMode] = useState<"plan" | "panic">("plan");
  const [panicParams, setPanicParams] = useState<PanicInput | null>(null);
  const [panicResult, setPanicResult] = useState<PanicResult | null>(null);
  const [panicLoading, setPanicLoading] = useState(false);
  const [panicError, setPanicError] = useState<string | null>(null);
  // What-if slider: quiet replans anchored to the last submitted budget
  const [whatIfBase, setWhatIfBase] = useState<number | null>(null);
  const [whatIfBusy, setWhatIfBusy] = useState(false);

  async function handleWhatIf(budget: number) {
    if (!plan) return;
    setWhatIfBusy(true);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...plan.input,
          budget,
          pantry_skus: readStore(PANTRY_KEY, EMPTY_STRINGS),
        }),
      });
      if (res.ok) setPlan(await res.json());
    } finally {
      setWhatIfBusy(false);
    }
  }

  async function searchPanic(params: PanicInput) {
    setPanicLoading(true);
    setPanicError(null);
    try {
      const res = await fetch("/api/panic", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error(`Panic API returned ${res.status}`);
      setPanicResult(await res.json());
    } catch (e) {
      setPanicError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setPanicLoading(false);
    }
  }

  function handlePanic(params: PanicInput) {
    setPanicParams(params);
    setMode("panic");
    setFormCollapsed(true);
    void searchPanic(params);
  }

  // Mid-week re-plan (roadmap #9): replan the remaining days against the
  // remaining budget. The new plan starts on the right weekday.
  async function handleReplan(remainingBudget: number, fromDayIdx: number) {
    if (!plan) return;
    const remainingDays = plan.input.days - fromDayIdx;
    if (remainingDays < 2) return;
    const startWeekday = ((plan.input.start_weekday ?? 0) + fromDayIdx) % 7;
    setLoading(true);
    setError(null);
    try {
      const [res] = await Promise.all([
        fetch("/api/plan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...plan.input,
            budget: remainingBudget,
            days: remainingDays,
            start_weekday: startWeekday,
            pantry_skus: readStore(PANTRY_KEY, EMPTY_STRINGS),
          }),
        }),
        new Promise((resolve) => setTimeout(resolve, 1200)),
      ]);
      if (!res.ok) throw new Error(`Plan API returned ${res.status}`);
      const data: Plan = await res.json();
      setPlan(data);
      setWhatIfBase(data.input.budget);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handlePlan(input: PlanInput) {
    setLoading(true);
    setError(null);
    try {
      // Mock MCP layer answers instantly; hold the agent progress state
      // ~1.6s so the staged feedback is perceivable.
      const [res] = await Promise.all([
        fetch("/api/plan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          // Pantry rides along on every plan: week 2 is cheaper than week 1
          body: JSON.stringify({
            ...input,
            pantry_skus: readStore(PANTRY_KEY, EMPTY_STRINGS),
          }),
        }),
        new Promise((resolve) => setTimeout(resolve, 1600)),
      ]);
      if (!res.ok) throw new Error(`Plan API returned ${res.status}`);
      const data: Plan = await res.json();
      setPlan(data);
      setMode("plan");
      setFormCollapsed(true);
      setWhatIfBase(data.input.budget);
      writeStore(FLINCH_KEY, true);

      const history = readStore<HistoryEntry[]>(HISTORY_KEY, EMPTY_HISTORY);
      writeStore(
        HISTORY_KEY,
        [
          ...history,
          {
            ts: Date.now(),
            budget: data.input.budget,
            total_cost: data.total_cost,
            days: data.input.days,
          },
        ].slice(-52),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <TopNav plan={plan} />
      <HeroBand compact={!!plan || loading} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 w-full flex-1 pb-16 -mt-7">
        <div className="grid lg:grid-cols-[380px_1fr] gap-6 items-start">
          {/* ── Control panel ── */}
          <aside className="lg:sticky lg:top-[4.5rem]">
            <FlinchCard />
            {formCollapsed && (plan || mode === "panic") && (
              <button
                onClick={() => setFormCollapsed(false)}
                className="lg:hidden w-full mb-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] shadow-[var(--shadow-card)] px-4 py-3 flex items-center justify-between text-sm"
              >
                <span className="font-mono">
                  {plan
                    ? `₹${plan.input.budget} · ${plan.input.days} days · ${plan.input.diet} · ${plan.input.city}`
                    : "Plan inputs"}
                </span>
                <span className="text-[var(--accent)] font-semibold">Edit</span>
              </button>
            )}
            <div className={(plan || mode === "panic") && formCollapsed ? "hidden lg:block" : ""}>
              <BudgetForm onSubmit={handlePlan} onPanic={handlePanic} loading={loading} />
            </div>
          </aside>

          {/* ── Results pane ── */}
          <section className="min-w-0">
            {error && (
              <div className="mb-4 rounded-xl border border-[var(--discount-red)]/30 bg-[var(--discount-red)]/10 text-[var(--discount-red)] p-4 text-sm">
                {error}
              </div>
            )}
            {mode === "panic" && panicParams ? (
              <PanicPane
                params={panicParams}
                result={panicResult}
                loading={panicLoading}
                error={panicError}
                onSearch={(budget) => {
                  const next = { ...panicParams, budget };
                  setPanicParams(next);
                  void searchPanic(next);
                }}
                onBack={() => setMode("plan")}
              />
            ) : loading ? (
              <AgentProgress />
            ) : plan ? (
              <PlanView
                plan={plan}
                whatIfBase={whatIfBase}
                whatIfBusy={whatIfBusy}
                onWhatIf={handleWhatIf}
                onReplan={handleReplan}
              />
            ) : (
              <EmptyState />
            )}
          </section>
        </div>

        <footer className="mt-16 pt-6 border-t border-[var(--border)] text-xs text-[var(--fg-muted)]">
          v0 · running on mocked Swiggy MCP responses · real endpoints once Builders
          Club approves access
        </footer>
      </main>
    </>
  );
}

/* ── Hero band ─────────────────────────────────────────────────── */

function HeroBand({ compact }: { compact: boolean }) {
  return (
    <div className="bg-gradient-to-br from-[#ff5200] via-[#f4470b] to-[#c93400] text-white">
      <div
        className={`max-w-6xl mx-auto px-4 sm:px-6 pb-12 transition-all ${
          compact ? "pt-6" : "pt-10 sm:pt-14"
        }`}
      >
        <h1
          className={`font-display font-bold tracking-tight leading-[1.05] ${
            compact ? "text-2xl sm:text-3xl" : "text-4xl sm:text-6xl"
          }`}
        >
          End of month? <span className="text-white/80">Plan it.</span>
        </h1>
        {!compact && (
          <p className="mt-3 text-white/90 text-sm sm:text-base max-w-xl">
            <span className="block">
              Give it your food budget and it plans every meal of the week.
            </span>
            <span className="block mt-1">
              It decides when you cook, order in, or dine out, and shows the math.
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Flinch onboarding (first visit only) ──────────────────────── */

function FlinchCard() {
  const done = useStoreValue<boolean>(FLINCH_KEY, false);
  const [monthly, setMonthly] = useState("");
  if (done) return null;

  const weekly = monthly ? Math.round(Number(monthly) / 4.33 / 10) * 10 : null;

  return (
    <div className="mb-3 rounded-2xl border border-[var(--accent)]/40 bg-[var(--bg-elevated)] shadow-[var(--shadow-card)] p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-semibold">Quick check before you start</div>
        <button
          onClick={() => writeStore(FLINCH_KEY, true)}
          aria-label="Dismiss"
          className="text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors leading-none text-lg"
        >
          ×
        </button>
      </div>
      <label className="block text-xs text-[var(--fg-muted)] mt-1.5">
        Roughly what goes to Swiggy in a month?
      </label>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-[var(--fg-muted)]">₹</span>
        <input
          type="number"
          min={0}
          max={100000}
          step={100}
          value={monthly}
          onChange={(e) => setMonthly(e.target.value)}
          placeholder="4000"
          className="no-spinner font-mono font-semibold bg-transparent border-b-2 border-[var(--border-strong)] focus:border-[var(--accent)] outline-none w-24 py-0.5 transition-colors tabular-nums"
        />
      </div>
      {weekly != null && weekly > 0 && (
        <p className="mt-2.5 text-xs leading-relaxed">
          That is about <span className="font-bold">₹{weekly} a week</span>. Set a
          weekly budget below and pocket the difference.
        </p>
      )}
    </div>
  );
}

/* ── Empty state — the three servers + ghost receipt ───────────── */

const SERVERS = [
  {
    icon: BikeIcon,
    name: "Food",
    line: "Cheapest landed cost across nearby restaurants, fees and coupons included.",
  },
  {
    icon: BasketIcon,
    name: "Instamart",
    line: "One weekly cart of shared staples that covers every cook day.",
  },
  {
    icon: DineIcon,
    name: "Dineout",
    line: "The one happy-hour slot that fits what's left of the budget.",
  },
];

function EmptyState() {
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        {SERVERS.map((s) => (
          <div
            key={s.name}
            className="rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] p-4 shadow-[var(--shadow-card)]"
          >
            <div className="w-9 h-9 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center mb-3">
              <s.icon className="w-5 h-5" />
            </div>
            <div className="text-sm font-semibold mb-1">{s.name}</div>
            <p className="text-xs text-[var(--fg-muted)] leading-relaxed">{s.line}</p>
          </div>
        ))}
      </div>

      {/* Ghost receipt so the pane hints at the output shape */}
      <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-6 opacity-60">
        <div className="text-xs uppercase tracking-widest text-[var(--fg-faint)] text-center mb-5">
          your week receipt appears here
        </div>
        <GhostRows />
      </div>
    </div>
  );
}

function GhostRows() {
  return (
    <div className="space-y-3 max-w-md mx-auto">
      {[64, 48, 72, 40, 56].map((w, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--bg-subtle)] shrink-0" />
          <div className="h-3 rounded bg-[var(--bg-subtle)]" style={{ width: `${w}%` }} />
          <div className="h-3 w-10 rounded bg-[var(--bg-subtle)] ml-auto shrink-0" />
        </div>
      ))}
    </div>
  );
}

/* ── Agentic loading state ─────────────────────────────────────── */

const AGENT_STEPS = [
  "Scanning Instamart staples…",
  "Comparing landed costs across restaurants…",
  "Checking happy-hour slots on Dineout…",
  "Balancing the week under budget…",
];

function AgentProgress() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % AGENT_STEPS.length), 850);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] shadow-[var(--shadow-card)] p-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="relative flex w-2.5 h-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-60" />
          <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-[var(--accent)]" />
        </span>
        <span key={step} className="text-sm font-medium row-in">
          {AGENT_STEPS[step]}
        </span>
      </div>
      <div className="space-y-3">
        {[70, 52, 78, 44, 62, 55, 68].map((w, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="skeleton w-8 h-8 rounded-full! shrink-0" />
            <div className="skeleton h-3" style={{ width: `${w}%` }} />
            <div className="skeleton h-3 w-10 ml-auto shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
