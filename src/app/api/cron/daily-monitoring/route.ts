import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { recordActivity } from "@/lib/activity-log";
import { CHECK_SLOTS, ensureDailyCheck, type CheckSlot } from "@/lib/daily-monitoring";

function verifyCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

const slotSchema = z.union([z.literal("1"), z.literal("2")]);

/** Dipanggil scheduler: slot 1 = 11:00–12:00 WIB, slot 2 = 20:00–21:00 WIB. */
export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slotParam = req.nextUrl.searchParams.get("slot") ?? "1";
  const parsedSlot = slotSchema.safeParse(slotParam);
  if (!parsedSlot.success) {
    return NextResponse.json({ error: "Invalid slot (1 or 2)" }, { status: 400 });
  }

  const slot = Number(parsedSlot.data) as CheckSlot;

  try {
    const result = await ensureDailyCheck(slot);

    await recordActivity(null, {
      action: "MONITORING_AUTOFILL",
      details: result.created
        ? `Daily check ${slot} otomatis (${result.dateKey}, ${CHECK_SLOTS[slot].windowLabel})`
        : `Daily check ${slot} sudah ada (${result.dateKey})`,
    });

    return NextResponse.json({
      ok: true,
      slot,
      created: result.created,
      dateKey: result.dateKey,
      entryId: result.entry.id,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error";
    console.error("[cron/daily-monitoring]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
