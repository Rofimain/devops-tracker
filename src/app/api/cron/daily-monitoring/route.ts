import { NextRequest, NextResponse } from "next/server";
import { recordActivity } from "@/lib/activity-log";
import { ensureAutoDailyMonitoringEntry } from "@/lib/daily-monitoring";

function verifyCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

/** Dipanggil scheduler eksternal setiap hari jam 15:00 WIB. */
export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await ensureAutoDailyMonitoringEntry();

    await recordActivity(null, {
      action: "MONITORING_AUTOFILL",
      details: result.created
        ? `Entri harian otomatis dibuat (${result.dateKey})`
        : `Entri harian sudah ada (${result.dateKey})`,
    });

    return NextResponse.json({
      ok: true,
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
