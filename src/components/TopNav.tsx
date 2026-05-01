import { ThemeToggle } from "./ThemeToggle";

export function TopNav() {
  return (
    <header className="sticky top-0 z-20 backdrop-blur-md bg-[var(--bg)]/80 border-b border-[var(--border)]">
      <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="font-display font-bold tracking-tight">End of Month</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-xs text-[var(--fg-muted)]">
            built on Swiggy MCP
          </span>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[var(--brand-deep)] to-[var(--accent)] flex items-center justify-center text-white font-bold text-sm shadow-sm">
      ₹
    </div>
  );
}
