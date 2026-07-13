import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity-log";
import { canWriteAppData } from "@/lib/roles";
import { parseYearParam, serviceCreateSchema } from "@/lib/report-monitoring";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const year = parseYearParam(req.nextUrl.searchParams.get("year"));

  const services = await prisma.reportMonitoringService.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      checks: {
        where: { year },
      },
    },
  });

  return NextResponse.json({ year, services });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canWriteAppData(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const json = await req.json();
    const parsed = serviceCreateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const maxSort = await prisma.reportMonitoringService.aggregate({ _max: { sortOrder: true } });
    const sortOrder = parsed.data.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1;

    const service = await prisma.reportMonitoringService.create({
      data: {
        name: parsed.data.name,
        period: parsed.data.period,
        sortOrder,
      },
    });

    await recordActivity(req, {
      action: "REPORT_MONITORING_SERVICE_CREATE",
      details: `Report Monitoring: tambah service "${service.name}" (${service.period})`,
      userId: session.user.id,
    });

    return NextResponse.json(service, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
