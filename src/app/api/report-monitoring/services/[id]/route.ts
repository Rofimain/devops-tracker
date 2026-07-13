import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity-log";
import { canWriteAppData } from "@/lib/roles";
import { monthsForPeriod, serviceUpdateSchema } from "@/lib/report-monitoring";
import { deleteReportMonitoringImage } from "@/lib/report-monitoring-storage";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = await prisma.reportMonitoringService.findUnique({
    where: { id: params.id },
    include: { checks: { orderBy: [{ year: "desc" }, { month: "asc" }] } },
  });
  if (!service) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(service);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canWriteAppData(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const existing = await prisma.reportMonitoringService.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const json = await req.json();
    const parsed = serviceUpdateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const nextPeriod = parsed.data.period ?? existing.period;
    const periodChanged = parsed.data.period != null && parsed.data.period !== existing.period;

    const service = await prisma.reportMonitoringService.update({
      where: { id: params.id },
      data: {
        name: parsed.data.name,
        period: parsed.data.period,
        sortOrder: parsed.data.sortOrder,
      },
    });

    if (periodChanged) {
      const allowed = new Set(monthsForPeriod(nextPeriod));
      const obsolete = await prisma.reportMonitoringCheck.findMany({
        where: { serviceId: params.id, month: { notIn: Array.from(allowed) } },
      });
      for (const check of obsolete) {
        await deleteReportMonitoringImage(check.imagePath);
      }
      if (obsolete.length > 0) {
        await prisma.reportMonitoringCheck.deleteMany({
          where: { id: { in: obsolete.map((c) => c.id) } },
        });
      }
    }

    await recordActivity(req, {
      action: "REPORT_MONITORING_SERVICE_UPDATE",
      details: `Report Monitoring: update service "${service.name}"`,
      userId: session.user.id,
    });

    return NextResponse.json(service);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canWriteAppData(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const existing = await prisma.reportMonitoringService.findUnique({
      where: { id: params.id },
      include: { checks: true },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    for (const check of existing.checks) {
      await deleteReportMonitoringImage(check.imagePath);
    }

    await prisma.reportMonitoringService.delete({ where: { id: params.id } });

    await recordActivity(req, {
      action: "REPORT_MONITORING_SERVICE_DELETE",
      details: `Report Monitoring: hapus service "${existing.name}"`,
      userId: session.user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
