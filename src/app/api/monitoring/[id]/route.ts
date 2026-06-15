import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity-log";
import { canWriteAppData } from "@/lib/roles";
import {
  CHECK_SLOTS,
  DAILY_ROW_TYPE,
  dailyMonitoringPatchSchema,
  monitoringPatchSchema,
  OPTIMIZE_ROW_TYPE,
} from "@/lib/daily-monitoring";
import { dateKeyToUtcDate, randomTimeInWibWindow, wibTimeOnDateToUtc } from "@/lib/monitoring-date";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canWriteAppData(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.devOpsMonitoringEntry.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.rowType === DAILY_ROW_TYPE && !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Baris monitoring harian tidak bisa diubah" }, { status: 403 });
  }
  if (existing.rowType === OPTIMIZE_ROW_TYPE && existing.source === "auto" && !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Entri otomatis hanya bisa diubah oleh Admin" }, { status: 403 });
  }

  try {
    const json = await req.json();

    if (existing.rowType === DAILY_ROW_TYPE) {
      const parsed = dailyMonitoringPatchSchema.safeParse(json);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

      const data = parsed.data;
      const dateKey = existing.dailyDateKey ?? existing.activityDate.toISOString().slice(0, 10);

      const resolveCheck = (
        slot: 1 | 2,
        nextStatus: string | undefined,
        nextTime: string | undefined,
        prevStatus: string | null,
        prevAt: Date | null
      ) => {
        if (nextStatus == null && nextTime == null) return {};

        const status = nextStatus ?? prevStatus ?? "Pending";
        const window = CHECK_SLOTS[slot];

        if (status === "Done") {
          const at =
            nextTime != null
              ? wibTimeOnDateToUtc(dateKey, nextTime)
              : prevAt ?? randomTimeInWibWindow(dateKey, window.startHour, window.endHour);
          return slot === 1 ? { check1Status: status, check1At: at } : { check2Status: status, check2At: at };
        }

        return slot === 1
          ? { check1Status: status, check1At: null }
          : { check2Status: status, check2At: null };
      };

      const entry = await prisma.devOpsMonitoringEntry.update({
        where: { id: params.id },
        data: {
          ...(data.application != null ? { application: data.application.trim() } : {}),
          ...(data.status != null ? { status: data.status } : {}),
          ...resolveCheck(1, data.check1Status, data.check1Time, existing.check1Status, existing.check1At),
          ...resolveCheck(2, data.check2Status, data.check2Time, existing.check2Status, existing.check2At),
        },
        include: { user: { select: { id: true, name: true, email: true } } },
      });

      await recordActivity(req, {
        action: "MONITORING_UPDATE",
        details: `Daily monitoring diubah (${dateKey})`,
        userId: session.user.id,
      });

      return NextResponse.json(entry);
    }

    const parsed = monitoringPatchSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const data = parsed.data;
    const entry = await prisma.devOpsMonitoringEntry.update({
      where: { id: params.id },
      data: {
        ...(data.activityCategory != null ? { activityCategory: "Optimize" } : {}),
        ...(data.activity != null ? { activity: data.activity.trim() } : {}),
        ...(data.activityDate != null ? { activityDate: dateKeyToUtcDate(data.activityDate) } : {}),
        ...(data.application != null ? { application: data.application.trim() } : {}),
        ...(data.status != null ? { status: data.status } : {}),
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    await recordActivity(req, {
      action: "MONITORING_UPDATE",
      details: `Monitoring diubah: "${entry.activity}"`,
      userId: session.user.id,
    });

    return NextResponse.json(entry);
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

  const existing = await prisma.devOpsMonitoringEntry.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.rowType === DAILY_ROW_TYPE && !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Baris monitoring harian tidak bisa dihapus" }, { status: 403 });
  }
  if (existing.source === "auto" && !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Entri otomatis tidak bisa dihapus" }, { status: 403 });
  }

  await recordActivity(req, {
    action: "MONITORING_DELETE",
    details: `Monitoring dihapus: "${existing.activity}"`,
    userId: session.user.id,
  });
  await prisma.devOpsMonitoringEntry.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
