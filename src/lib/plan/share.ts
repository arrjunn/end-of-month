// Plain-text week receipt for the Web Share API / clipboard.

import type { Plan } from "./types";

const SITE_URL = "https://end-of-month.vercel.app";

export function formatPlanText(plan: Plan): string {
  const header = [
    "END OF MONTH · WEEK RECEIPT",
    `${plan.input.days}-day plan · ${plan.input.profile} · ${plan.input.city} · ${plan.input.diet}`,
    "",
  ];

  const rows = plan.days.map((d) => {
    const cost = d.cost > 0 ? `₹${d.cost}` : "—";
    return `Day ${d.day} ${d.weekday}  ${d.type.padEnd(7)} ${d.description}  ${cost}`;
  });

  const footer = [
    "",
    `TOTAL ₹${plan.total_cost} of ₹${plan.input.budget} · SAVED ₹${Math.max(0, plan.input.budget - plan.total_cost)}`,
    "",
    `planned with End of Month · ${SITE_URL}`,
  ];

  return [...header, ...rows, ...footer].join("\n");
}
