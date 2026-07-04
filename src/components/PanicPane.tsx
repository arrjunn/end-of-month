"use client";

import { useState } from "react";
import type { PanicInput, PanicResult } from "@/lib/plan/panic";
import { BikeIcon, PanIcon } from "./icons";

interface Props {
  params: PanicInput;
  result: PanicResult | null;
  loading: boolean;
  error: string | null;
  onSearch: (budget: number) => void;
  onBack: () => void;
}

export function PanicPane({ params, result, loading, error, onSearch, onBack }: Props) {
  const [amount, setAmount] = useState(params.budget);

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="rounded-2xl bg-[var(--bg-elevated)] border border-[var(--discount-red)]/40 shadow-[var(--shadow-card)] p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="font-display text-lg font-bold">Feed me now</div>
            <div className="text-xs text-[var(--fg-muted)] mt-0.5">
              best landed cost near you, right now
            </div>
          </div>
          <button
            onClick={onBack}
            className="text-sm font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
          >
            Back to plan
          </button>
        </div>
        <form
          className="mt-4 flex items-center gap-3 flex-wrap"
          onSubmit={(e) => {
            e.preventDefault();
            onSearch(amount);
          }}
        >
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
            Left for today
          </label>
          <div className="flex items-baseline gap-1">
            <span className="text-[var(--fg-muted)]">₹</span>
            <input
              type="number"
              min={30}
              max={2000}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="no-spinner font-mono font-semibold bg-transparent border-b-2 border-[var(--border)] focus:border-[var(--discount-red)] outline-none w-20 py-0.5 transition-colors tabular-nums"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1.5 rounded-lg bg-[var(--discount-red)] text-white text-sm font-semibold disabled:opacity-60 transition-opacity"
          >
            {loading ? "Finding…" : "Find food"}
          </button>
        </form>
      </div>

      {error && (
        <div className="rounded-xl border border-[var(--discount-red)]/30 bg-[var(--discount-red)]/10 text-[var(--discount-red)] p-4 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-20 rounded-2xl!" />
          ))}
        </div>
      )}

      {!loading && result && (
        <>
          {result.options.length === 0 && !result.cook_fallback && (
            <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-6 text-center text-sm text-[var(--fg-muted)]">
              Nothing lands under ₹{result.budget} right now. Try a higher amount.
            </div>
          )}

          {result.options.map((o, i) => (
            <div
              key={`${o.restaurant}-${o.item}`}
              className="row-in rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] shadow-[var(--shadow-card)] p-4 flex items-center gap-4"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="w-9 h-9 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center shrink-0">
                <BikeIcon className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[10px] uppercase text-[var(--fg-faint)]">
                    #{i + 1}
                  </span>
                  <span className="text-sm font-semibold">{o.item}</span>
                  {o.coupon_code && <span className="coupon-ticket">{o.coupon_code}</span>}
                </div>
                <div className="text-xs text-[var(--fg-muted)] mt-0.5">
                  {o.restaurant} · {o.calories} kcal
                </div>
                <div className="text-[11px] text-[var(--fg-faint)] mt-1 font-mono">
                  {o.breakdown}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-display text-xl font-bold tabular-nums">
                  ₹{o.landed}
                </div>
                <div className="text-[10px] text-[var(--fg-faint)]">landed</div>
              </div>
            </div>
          ))}

          {result.cook_fallback && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-start gap-3">
              <span className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <PanIcon className="w-4.5 h-4.5" />
              </span>
              <p className="text-sm text-emerald-800 dark:text-emerald-200 leading-relaxed">
                {result.cook_fallback}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
