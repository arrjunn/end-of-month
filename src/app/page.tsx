"use client";

import { useState } from "react";
import { BudgetForm } from "@/components/BudgetForm";
import { PlanView } from "@/components/PlanView";
import type { Plan, PlanInput } from "@/lib/plan/types";

export default function Home() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePlan(input: PlanInput) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`Plan API returned ${res.status}`);
      const data: Plan = await res.json();
      setPlan(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-10 w-full flex-1">
      <header className="mb-8">
        <h1 className="font-display text-5xl sm:text-6xl font-bold tracking-tight leading-[1.05]">
          End of month?<br />
          <span className="bg-gradient-to-r from-[var(--brand-deep)] to-[var(--accent)] bg-clip-text text-transparent">
            Plan it.
          </span>
        </h1>
        <p className="mt-4 text-[var(--fg-muted)] text-base max-w-lg">
          Tell it your week&apos;s food budget. It plans cook days, order days, and one cheap night
          out across Swiggy Food, Instamart, and Dineout — in a single pass.
        </p>
      </header>

      <BudgetForm onSubmit={handlePlan} loading={loading} />

      {error && (
        <div className="mt-6 rounded-xl border border-[var(--discount-red)]/30 bg-[var(--discount-red)]/10 text-[var(--discount-red)] p-4 text-sm">
          {error}
        </div>
      )}

      {plan && (
        <div className="mt-10">
          <PlanView plan={plan} />
        </div>
      )}

      <footer className="mt-16 pt-6 border-t border-[var(--border)] text-xs text-[var(--fg-muted)]">
        v0 · running on mocked Swiggy MCP responses · real endpoints once Builders Club approves access
      </footer>
    </main>
  );
}
