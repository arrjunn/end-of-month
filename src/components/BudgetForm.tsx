"use client";

import { useState } from "react";
import type { PlanInput } from "@/lib/plan/types";
import type { Diet, Profile, Coords } from "@/lib/mcp/types";
import { getCurrentPosition, reverseGeocode } from "@/lib/location";
import { CityCombobox } from "./CityCombobox";

const DIETS: { value: Diet; label: string }[] = [
  { value: "veg", label: "Veg" },
  { value: "non-veg", label: "Non-veg" },
  { value: "vegan", label: "Vegan" },
];
const PROFILES: { value: Profile; label: string; sub: string }[] = [
  { value: "hostel", label: "Hostel student", sub: "kettle / microwave only" },
  { value: "working", label: "Working pro", sub: "full kitchen, time-pressed" },
  { value: "family", label: "Family", sub: "multi-portion meals" },
];
const DAY_PRESETS = [3, 5, 7];
const MIN_DAYS = 2;
const MAX_DAYS = 7;

interface Props {
  onSubmit: (input: PlanInput) => void;
  loading: boolean;
}

export function BudgetForm({ onSubmit, loading }: Props) {
  const [budget, setBudget] = useState(600);
  const [maxPerOrder, setMaxPerOrder] = useState("");
  const [diet, setDiet] = useState<Diet>("veg");
  const [city, setCity] = useState<string>("Bangalore");
  const [profile, setProfile] = useState<Profile>("working");
  const [days, setDays] = useState<number>(7);
  const [customDays, setCustomDays] = useState(false);
  const [coords, setCoords] = useState<Coords | undefined>();
  const [locating, setLocating] = useState(false);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  async function detectLocation() {
    setLocating(true);
    setLocationError(null);
    try {
      const pos = await getCurrentPosition();
      const geo = await reverseGeocode(pos);
      setCoords(pos);
      setCity(geo.city);
      setLocationLabel(geo.display);
    } catch (e) {
      setLocationError(e instanceof Error ? e.message : "Couldn't get your location");
    } finally {
      setLocating(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          budget,
          diet,
          city,
          profile,
          days: Math.min(MAX_DAYS, Math.max(MIN_DAYS, days)),
          max_per_order: maxPerOrder ? Number(maxPerOrder) : undefined,
          coords,
        });
      }}
      className="rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] shadow-[var(--shadow-card)] overflow-hidden"
    >
      <div className="p-5 sm:p-6 space-y-6">
        {/* 01 · Budget */}
        <Section step="01" label="Weekly food budget">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-semibold text-[var(--fg-muted)]">
              ₹
            </span>
            <input
              type="number"
              min={200}
              max={10000}
              step={50}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="no-spinner font-display text-4xl font-bold bg-transparent border-b-2 border-[var(--border)] focus:border-[var(--accent)] outline-none w-36 py-1 transition-colors tabular-nums"
            />
          </div>
        </Section>

        {/* 02 · Days */}
        <Section step="02" label="How many days">
          <Segmented
            options={[
              ...DAY_PRESETS.map((n) => ({ value: String(n), label: `${n} days` })),
              { value: "custom", label: "Custom" },
            ]}
            value={customDays ? "custom" : String(days)}
            onChange={(v) => {
              if (v === "custom") {
                setCustomDays(true);
              } else {
                setCustomDays(false);
                setDays(Number(v));
              }
            }}
          />
          {customDays && (
            <div className="mt-2.5 flex items-center gap-3">
              <div className="flex items-center rounded-xl border border-[var(--border)] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setDays((d) => Math.max(MIN_DAYS, d - 1))}
                  disabled={days <= MIN_DAYS}
                  className="px-3.5 py-2 text-lg font-semibold text-[var(--fg-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                  aria-label="Fewer days"
                >
                  −
                </button>
                <span className="w-16 text-center font-mono text-sm font-semibold tabular-nums border-x border-[var(--border)] py-2">
                  {days} {days === 1 ? "day" : "days"}
                </span>
                <button
                  type="button"
                  onClick={() => setDays((d) => Math.min(MAX_DAYS, d + 1))}
                  disabled={days >= MAX_DAYS}
                  className="px-3.5 py-2 text-lg font-semibold text-[var(--fg-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)] disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                  aria-label="More days"
                >
                  +
                </button>
              </div>
              <span className="text-xs text-[var(--fg-muted)]">
                {MIN_DAYS} to {MAX_DAYS} days. Week plans start Monday.
              </span>
            </div>
          )}
        </Section>

        {/* 03 · Who & diet */}
        <Section step="03" label="Who's eating">
          <div className="space-y-1.5">
            {PROFILES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setProfile(p.value)}
                className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all flex items-center gap-3 ${
                  profile === p.value
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--border)] hover:border-[var(--border-strong)]"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                    profile === p.value
                      ? "border-[var(--accent)]"
                      : "border-[var(--border-strong)]"
                  }`}
                >
                  {profile === p.value && (
                    <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                  )}
                </span>
                <span>
                  <span className="block text-sm font-semibold">{p.label}</span>
                  <span className="block text-xs text-[var(--fg-muted)]">{p.sub}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="mt-3">
            <Segmented
              options={DIETS.map((d) => ({ value: d.value, label: d.label }))}
              value={diet}
              onChange={setDiet}
            />
          </div>
        </Section>

        {/* 04 · Location */}
        <Section step="04" label="Location">
          <div className="flex gap-2 items-center">
            <div className="flex-1 min-w-0">
              <CityCombobox value={city} onChange={setCity} />
            </div>
            <button
              type="button"
              onClick={detectLocation}
              disabled={locating}
              title="Use my location"
              className="p-2.5 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50 transition-colors shrink-0"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="10" r="3" />
                <path d="M12 22s-8-7.5-8-13a8 8 0 0 1 16 0c0 5.5-8 13-8 13z" />
              </svg>
            </button>
          </div>
          {locating && (
            <p className="mt-2 text-xs text-[var(--fg-muted)]">Detecting…</p>
          )}
          {locationLabel && (
            <p className="mt-2 text-xs text-[var(--rating-green)]">
              ✓ Detected: {locationLabel}
            </p>
          )}
          {locationError && (
            <p className="mt-2 text-xs text-[var(--discount-red)]">{locationError}</p>
          )}
          {city && city !== "Bangalore" && (
            <p className="mt-2 text-xs text-[var(--fg-muted)]">
              v0 fixtures are Bangalore-flavored. Real Swiggy data fills in for your
              city when API access lands.
            </p>
          )}
        </Section>

        {/* Advanced */}
        <details className="group">
          <summary className="cursor-pointer select-none list-none text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)] inline-flex items-center gap-1.5">
            Advanced
            <span className="group-open:rotate-180 transition-transform text-[9px]">
              ▾
            </span>
          </summary>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[var(--fg-muted)] text-sm">₹</span>
              <input
                type="number"
                min={50}
                max={5000}
                step={10}
                value={maxPerOrder}
                onChange={(e) => setMaxPerOrder(e.target.value)}
                placeholder="none"
                className="no-spinner font-mono text-sm bg-transparent border-b-2 border-[var(--border)] focus:border-[var(--accent)] outline-none w-20 py-1 transition-colors"
              />
            </div>
            <span className="text-xs text-[var(--fg-muted)]">
              per-order cap. No single order or booking can exceed this.
            </span>
          </div>
        </details>
      </div>

      {/* CTA */}
      <div className="p-4 sm:p-5 pt-0">
        <button
          type="submit"
          disabled={loading}
          className="font-display w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold py-3.5 rounded-xl disabled:opacity-60 transition-colors text-base tracking-wide shadow-[var(--shadow-card)]"
        >
          {loading ? "Planning your week…" : "Plan my week"}
        </button>
      </div>
    </form>
  );
}

/* ── Building blocks ──────────────────────────────────────────── */

function Section({
  step,
  label,
  children,
}: {
  step: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-baseline gap-2 mb-2.5">
        <span className="font-mono text-[10px] text-[var(--accent)] font-bold">
          {step}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
          {label}
        </span>
      </label>
      {children}
    </div>
  );
}

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex p-1 gap-1 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 px-2 py-2 rounded-lg text-sm font-medium transition-all ${
            value === o.value
              ? "bg-[var(--bg-elevated)] text-[var(--accent)] font-semibold shadow-sm"
              : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
