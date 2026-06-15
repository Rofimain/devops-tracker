import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity-log";
import { canWriteAppData } from "@/lib/roles";
import { monitoringPatchSchema } from "@/lib/daily-monitoring";
import { dateKeyToUtcDate } from "@/lib/monitoring-date";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canWriteAppData(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.devOpsMonitoringEntry.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canEdit = existing.source === "manual" || isAdmin(session.user.role);
  if (!canEdit) {
    return NextResponse.json({ error: "Entri otomatis hanya bisa diubah oleh Admin" }, { status: 403 });
  }

  try {
    const json = await req.json();
    const parsed = monitoringPatchSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const data = parsed.data;
    const entry = await prisma.devOpsMonitoringEntry.update({
      where: { id: params.id },
      data: {
        ...(data.activityCategory != null ? { activityCategory: data.activityCategory } : {}),
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
