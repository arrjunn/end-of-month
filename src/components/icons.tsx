// Tiny inline icon set — one per day-type / MCP server. Stroke inherits
// currentColor so the parent controls the tint.

interface IconProps {
  className?: string;
}

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Cook days / Instamart cart */
export function PanIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <ellipse cx="10" cy="13" rx="7" ry="4.5" />
      <path d="M17 12.2 22 10.5" />
      <path d="M6.5 5.5c0-1 1-1 1-2M10.5 5.5c0-1 1-1 1-2M14.5 5.5c0-1 1-1 1-2" />
    </svg>
  );
}

/** Order-in days / Swiggy Food */
export function BikeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <circle cx="5.5" cy="17" r="3.2" />
      <circle cx="18.5" cy="17" r="3.2" />
      <path d="M5.5 17 9 10h5.5M12 17h6.5M14.5 10l4 7M9.5 7H13" />
    </svg>
  );
}

/** Dineout night */
export function DineIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M5 3v7M8 3v7M6.5 10v11M6.5 10c1.4 0 2.2-.9 2.2-2.5V3M5 3v4.5" />
      <path d="M17 3c-2 1.5-2.8 4-2.8 7 0 1.5.8 2.5 2.3 2.5V21M17 3v18" />
    </svg>
  );
}

/** Offers / save-more tips */
export function TagIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M3 3h8l10 10-8 8L3 11V3Z" />
      <circle cx="8" cy="8" r="1.4" />
    </svg>
  );
}

/** Instamart basket */
export function BasketIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...base}>
      <path d="M4 9h16l-1.6 9.2a2 2 0 0 1-2 1.8H7.6a2 2 0 0 1-2-1.8L4 9Z" />
      <path d="M8.5 9 12 3.5 15.5 9M9.5 13v3.5M14.5 13v3.5" />
    </svg>
  );
}
