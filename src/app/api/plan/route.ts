import { NextResponse } from "next/server";
import { z } from "zod";
import { generatePlan } from "@/lib/plan/generate";

const PlanRequest = z.object({
  budget: z.number().int().min(100).max(10000),
  diet: z.enum(["veg", "non-veg", "vegan"]),
  city: z.string().trim().min(2).max(80),
  profile: z.enum(["hostel", "working", "family"]),
  days: z.number().int().min(2).max(7),
  max_per_order: z.number().int().min(50).max(5000).optional(),
  pantry_skus: z.array(z.string().max(60)).max(50).optional(),
  payday_day: z.number().int().min(1).max(31).optional(),
  template: z.enum(["exam", "guests", "recovery"]).optional(),
  coords: z
    .object({ lat: z.number(), lng: z.number() })
    .optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = PlanRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid input", issues: parsed.error.issues }, { status: 422 });
  }

  const plan = await generatePlan(parsed.data);
  return NextResponse.json(plan);
}
