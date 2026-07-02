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
const DAY_OPTIONS = [3, 5, 7];

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
          days,
          max_per_order: maxPerOrder ? Number(maxPerOrder) : undefined,
          coords,
        });
      }}
      className="rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] p-6 sm:p-8 shadow-[var(--shadow-card)] space-y-7"
    >
      {/* Budget — hero input */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)] mb-3">
          Food budget for the week
        </label>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-4xl font-semibold text-[var(--fg-muted)]">₹</span>
          <input
            type="number"
            min={200}
            max={10000}
            step={50}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="font-display text-5xl font-bold bg-transparent border-b-2 border-[var(--border)] focus:border-[var(--accent)] outline-none w-40 py-1 transition-colors"
          />
        </div>
      </div>

      {/* Per-order spend cap */}
      <Field label="Per-order cap (optional)">
        <div className="flex items-center gap-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[var(--fg-muted)]">₹</span>
            <input
              type="number"
              min={50}
              max={5000}
              step={10}
              value={maxPerOrder}
              onChange={(e) => setMaxPerOrder(e.target.value)}
              placeholder="none"
              className="font-mono bg-transparent border-b-2 border-[var(--border)] focus:border-[var(--accent)] outline-none w-24 py-1 transition-colors"
            />
          </div>
          <span className="text-xs text-[var(--fg-muted)]">
            hard cap — no single order or booking can exceed this
          </span>
        </div>
      </Field>

      {/* Plan length */}
      <Field label="How many days">
        <div className="flex gap-2">
          {DAY_OPTIONS.map((n) => (
            <Pill key={n} active={days === n} onClick={() => setDays(n)}>
              {n} days
            </Pill>
          ))}
        </div>
      </Field>

      {/* Profile */}
      <Field label="Who's eating">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {PROFILES.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setProfile(p.value)}
              className={`text-left p-3 rounded-xl border transition-all ${
                profile === p.value
                  ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                  : "border-[var(--border)] hover:border-[var(--border-strong)]"
              }`}
            >
              <div className="text-sm font-semibold">{p.label}</div>
              <div className="text-xs text-[var(--fg-muted)] mt-0.5">{p.sub}</div>
            </button>
          ))}
        </div>
      </Field>

      {/* Diet */}
      <Field label="Diet">
        <div className="flex flex-wrap gap-2">
          {DIETS.map((d) => (
            <Pill key={d.value} active={diet === d.value} onClick={() => setDiet(d.value)}>
              {d.label}
            </Pill>
          ))}
        </div>
      </Field>

      {/* City + geolocation */}
      <Field label="Location">
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <div className="flex-1">
            <CityCombobox value={city} onChange={setCity} />
          </div>
          <button
            type="button"
            onClick={detectLocation}
            disabled={locating}
            className="text-sm px-3 py-2 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="10" r="3" />
              <path d="M12 22s-8-7.5-8-13a8 8 0 0 1 16 0c0 5.5-8 13-8 13z" />
            </svg>
            {locating ? "Detecting…" : "Use my location"}
          </button>
        </div>
        {locationLabel && (
          <p className="mt-2 text-xs text-[var(--rating-green)]">✓ Detected: {locationLabel}</p>
        )}
        {locationError && (
          <p className="mt-2 text-xs text-[var(--discount-red)]">{locationError}</p>
        )}
        {city && city !== "Bangalore" && (
          <p className="mt-2 text-xs text-[var(--fg-muted)]">
            v0 fixtures are Bangalore-flavored. Real Swiggy data fills in for your city when API access lands.
          </p>
        )}
      </Field>

      <button
        type="submit"
        disabled={loading}
        className="font-display w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold py-3.5 rounded-xl disabled:opacity-50 transition-colors text-base tracking-wide"
      >
        {loading ? "Planning your week…" : "Plan my week"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)] mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
        active
          ? "border-[var(--accent)] bg-[var(--accent)] text-white"
          : "border-[var(--border)] hover:border-[var(--border-strong)] text-[var(--fg)]"
      }`}
    >
      {children}
    </button>
  );
}
