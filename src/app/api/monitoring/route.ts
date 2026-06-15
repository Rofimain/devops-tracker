import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity-log";
import { canWriteAppData } from "@/lib/roles";
import { monitoringEntrySchema, OPTIMIZE_ROW_TYPE } from "@/lib/daily-monitoring";
import { dateKeyToUtcDate, monthDateRange, parseMonthParam } from "@/lib/monitoring-date";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const monthParam = req.nextUrl.searchParams.get("month");
  const month = parseMonthParam(monthParam ?? undefined);
  const range = monthDateRange(month);

  const entries = await prisma.devOpsMonitoringEntry.findMany({
    where: { activityDate: range },
    orderBy: [{ activityDate: "asc" }, { rowType: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ month, entries });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canWriteAppData(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const json = await req.json();
    const parsed = monitoringEntrySchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const entry = await prisma.devOpsMonitoringEntry.create({
      data: {
        rowType: OPTIMIZE_ROW_TYPE,
        activityCategory: "Optimize",
        activity: parsed.data.activity.trim(),
        activityDate: dateKeyToUtcDate(parsed.data.activityDate),
        application: parsed.data.application.trim(),
        status: parsed.data.status,
        source: "manual",
        userId: session.user.id,
      },
    });

    await recordActivity(req, {
      action: "MONITORING_CREATE",
      details: `Monitoring: "${entry.activity}" (${parsed.data.activityDate})`,
      userId: session.user.id,
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
