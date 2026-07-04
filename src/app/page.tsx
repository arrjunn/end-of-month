"use client";

import { useEffect, useState } from "react";
import { TopNav } from "@/components/TopNav";
import { BudgetForm } from "@/components/BudgetForm";
import { PlanView } from "@/components/PlanView";
import { BikeIcon, BasketIcon, DineIcon } from "@/components/icons";
import type { Plan, PlanInput } from "@/lib/plan/types";

export default function Home() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // After a plan lands, the form collapses to a summary chip on mobile so
  // the receipt owns the screen. Desktop always shows both panes.
  const [formCollapsed, setFormCollapsed] = useState(false);

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
          body: JSON.stringify(input),
        }),
        new Promise((resolve) => setTimeout(resolve, 1600)),
      ]);
      if (!res.ok) throw new Error(`Plan API returned ${res.status}`);
      const data: Plan = await res.json();
      setPlan(data);
      setFormCollapsed(true);
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
            {plan && formCollapsed && (
              <button
                onClick={() => setFormCollapsed(false)}
                className="lg:hidden w-full mb-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] shadow-[var(--shadow-card)] px-4 py-3 flex items-center justify-between text-sm"
              >
                <span className="font-mono">
                  ₹{plan.input.budget} · {plan.input.days} days · {plan.input.diet} ·{" "}
                  {plan.input.city}
                </span>
                <span className="text-[var(--accent)] font-semibold">Edit</span>
              </button>
            )}
            <div className={plan && formCollapsed ? "hidden lg:block" : ""}>
              <BudgetForm onSubmit={handlePlan} loading={loading} />
            </div>
          </aside>

          {/* ── Results pane ── */}
          <section className="min-w-0">
            {error && (
              <div className="mb-4 rounded-xl border border-[var(--discount-red)]/30 bg-[var(--discount-red)]/10 text-[var(--discount-red)] p-4 text-sm">
                {error}
              </div>
            )}
            {loading ? (
              <AgentProgress />
            ) : plan ? (
              <PlanView plan={plan} />
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
          <>
            <p className="mt-3 text-white/90 text-sm sm:text-base max-w-2xl">
              ₹600 left till payday? Tell it your budget and it plans every meal of
              the week — which days you cook from one cheap Instamart cart, which
              days you order in (picked by what food really costs after fees and
              coupons), and one night out that still fits.
            </p>
            <p className="mt-2 text-white/70 text-xs sm:text-sm max-w-2xl">
              Stays under your budget, shows the math for every pick — one agent
              across Swiggy Food, Instamart, and Dineout.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Empty state — the three servers + ghost receipt ───────────── */

const SERVERS = [
  {
    icon: BikeIcon,
    name: "Food",
    line: "Cheapest landed cost across nearby restaurants — fees and coupons included.",
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
