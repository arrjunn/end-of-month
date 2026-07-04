import { NextResponse } from "next/server";
import { z } from "zod";
import { findPanicOptions } from "@/lib/plan/panic";

const PanicRequest = z.object({
  budget: z.number().int().min(30).max(2000),
  diet: z.enum(["veg", "non-veg", "vegan"]),
  city: z.string().trim().min(2).max(80),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = PanicRequest.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid input", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const result = await findPanicOptions(parsed.data);
  return NextResponse.json(result);
}
