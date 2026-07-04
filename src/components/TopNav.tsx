import type { Plan } from "@/lib/plan/types";
import { ThemeToggle } from "./ThemeToggle";

interface Props {
  /** When a plan exists, the nav pins a budget burn-down bar. */
  plan?: Plan | null;
}

export function TopNav({ plan }: Props) {
  return (
    <header className="sticky top-0 z-20 backdrop-blur-md bg-[var(--bg)]/85 border-b border-[var(--border)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 shrink-0">
          <Logo />
          <span className="font-display font-bold tracking-tight text-[15px]">
            End of Month
          </span>
        </div>

        {plan && <BurnDown plan={plan} />}

        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden md:inline text-xs text-[var(--fg-muted)]">
            built on Swiggy MCP
          </span>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

/** Budget burn-down pinned in the header — runway, not per-meal cost. */
function BurnDown({ plan }: { plan: Plan }) {
  const pct = Math.min(100, Math.round((plan.total_cost / plan.input.budget) * 100));
  const pace =
    pct <= 85
      ? "var(--rating-green)"
      : pct <= 100
        ? "var(--accent)"
        : "var(--discount-red)";

  return (
    <div className="flex-1 max-w-xs hidden sm:flex items-center gap-3 min-w-0">
      <div className="flex-1 h-1.5 bg-[var(--bg-subtle)] rounded-full overflow-hidden border border-[var(--border)]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: pace }}
        />
      </div>
      <span className="font-mono text-xs whitespace-nowrap tabular-nums">
        ₹{plan.total_cost}
        <span className="text-[var(--fg-muted)]">/₹{plan.input.budget}</span>
      </span>
    </div>
  );
}

function Logo() {
  return (
    <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white font-display font-bold text-base shadow-sm">
      ₹
    </div>
  );
}
