// Browser geolocation + reverse geocoding + nearest-city resolver.
// All free: navigator.geolocation (built-in) + OpenStreetMap Nominatim (free, no key).

import type { City } from "@/lib/mcp/types";
import { INDIAN_CITIES } from "@/data/indian-cities";

/** Haversine distance in km between two lat/lng pairs. */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** Pick the nearest curated city to a lat/lng — fallback if reverse-geocode fails. */
export function nearestCity(coords: { lat: number; lng: number }): { city: City; state: string; distance_km: number } {
  let best = { city: INDIAN_CITIES[0].name, state: INDIAN_CITIES[0].state, distance_km: Number.POSITIVE_INFINITY };
  for (const c of INDIAN_CITIES) {
    const d = haversineKm(coords, { lat: c.lat, lng: c.lng });
    if (d < best.distance_km) best = { city: c.name, state: c.state, distance_km: d };
  }
  return best;
}

/** Rough "minutes to reach" using straight-line km × city avg speed.
 *  Indian metro driving avg ~18 km/h in traffic; we add a 1.3 detour factor. */
export function estimateTravelMinutes(distanceKm: number): number {
  const detour = distanceKm * 1.3;
  const minutes = (detour / 18) * 60;
  return Math.max(5, Math.round(minutes));
}

/** Promisified browser geolocation. */
export function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation not supported in this browser"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(err.message)),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  });
}

interface ReverseGeocodeResult {
  city: string;
  state: string;
  area?: string; // suburb/neighborhood if available
  display: string; // human-readable concatenation
}

/** Reverse-geocode lat/lng to a real city name via Nominatim (OpenStreetMap).
 *  Free, no key. Rate-limited to ~1 req/s by their fair-use policy.
 *  Falls back to nearest curated city on failure. */
export async function reverseGeocode(coords: { lat: number; lng: number }): Promise<ReverseGeocodeResult> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(coords.lat));
    url.searchParams.set("lon", String(coords.lng));
    url.searchParams.set("zoom", "10");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("accept-language", "en");

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    const data: {
      address?: {
        city?: string;
        town?: string;
        village?: string;
        state_district?: string;
        county?: string;
        state?: string;
        suburb?: string;
        neighbourhood?: string;
      };
      display_name?: string;
    } = await res.json();

    const addr = data.address ?? {};
    const city =
      addr.city ?? addr.town ?? addr.village ?? addr.county ?? addr.state_district ?? "";
    const state = addr.state ?? "";
    const area = addr.suburb ?? addr.neighbourhood;

    if (!city) throw new Error("No city in geocode result");

    return {
      city,
      state,
      area,
      display: area ? `${area}, ${city}` : city,
    };
  } catch {
    // Fallback to nearest curated city if Nominatim is down or rate-limits us
    const nearest = nearestCity(coords);
    return {
      city: nearest.city,
      state: nearest.state,
      display: `${nearest.city} (approx — ${nearest.distance_km.toFixed(1)} km from city center)`,
    };
  }
}
