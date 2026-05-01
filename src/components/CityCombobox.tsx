"use client";

import { useEffect, useRef, useState } from "react";
import { INDIAN_CITIES } from "@/data/indian-cities";

interface Props {
  value: string;
  onChange: (city: string) => void;
}

export function CityCombobox({ value, onChange }: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Keep the input in sync if the parent updates `value` (e.g. from geolocation)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Click-outside to close
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Filter: starts-with first, then contains
  const q = query.trim().toLowerCase();
  const matches = q
    ? [
        ...INDIAN_CITIES.filter((c) => c.name.toLowerCase().startsWith(q)),
        ...INDIAN_CITIES.filter(
          (c) =>
            !c.name.toLowerCase().startsWith(q) &&
            (c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q)),
        ),
      ].slice(0, 10)
    : INDIAN_CITIES.slice(0, 10);

  function commit(city: string) {
    onChange(city);
    setQuery(city);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (matches[highlight]) {
        commit(matches[highlight].name);
      } else if (query.trim()) {
        // Free-text input: accept whatever the user typed
        commit(query.trim());
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // Keep highlighted option visible when navigating
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[highlight] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)] pointer-events-none"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          type="text"
          value={query}
          placeholder="Search any Indian city…"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            // Commit free-text on blur if it differs from current value
            if (query.trim() && query.trim() !== value) {
              onChange(query.trim());
            }
          }}
          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg pl-9 pr-3 py-2 text-sm focus:border-[var(--accent)] outline-none"
        />
      </div>

      {open && matches.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-30 mt-1 w-full max-h-72 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow-elevated)] py-1"
        >
          {matches.map((c, i) => (
            <li
              key={`${c.name}-${c.state}`}
              onMouseDown={(e) => {
                e.preventDefault();
                commit(c.name);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={`px-3 py-2 cursor-pointer flex items-center justify-between text-sm ${
                i === highlight ? "bg-[var(--accent-soft)]" : ""
              }`}
            >
              <span className="font-medium">{c.name}</span>
              <span className="text-xs text-[var(--fg-muted)]">{c.state}</span>
            </li>
          ))}
          {q && !matches.some((m) => m.name.toLowerCase() === q) && (
            <li className="px-3 py-2 text-xs text-[var(--fg-muted)] border-t border-[var(--border)]">
              Press Enter to use “{query.trim()}”
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
