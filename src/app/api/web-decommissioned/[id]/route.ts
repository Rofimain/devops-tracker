import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity-log";
import { canWriteAppData } from "@/lib/roles";
import {
  toPrismaWriteData,
  webDecommissionUpsertSchema,
} from "@/lib/web-decommissioned";
import {
  deleteWebDecommissionImage,
  deleteWebDecommissionRecordDir,
} from "@/lib/web-decommissioned-storage";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const record = await prisma.webDecommissionRecord.findUnique({
    where: { id: params.id },
    include: { evidences: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
  });
  if (!record) return NextResponse.json({ error: "Record tidak ditemukan" }, { status: 404 });
  return NextResponse.json(record);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canWriteAppData(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const existing = await prisma.webDecommissionRecord.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Record tidak ditemukan" }, { status: 404 });

    const body = await req.json();
    const parsed = webDecommissionUpsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data tidak valid" },
        { status: 400 }
      );
    }

    const record = await prisma.webDecommissionRecord.update({
      where: { id: params.id },
      data: toPrismaWriteData(parsed.data),
      include: { evidences: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
    });

    await recordActivity(req, {
      action: "WEB_DECOMMISSION_UPDATE",
      details: `Web Decommissioned: update "${record.platformName}" (${record.domainUrl})`,
      userId: session.user.id,
    });

    return NextResponse.json(record);
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
    const existing = await prisma.webDecommissionRecord.findUnique({
      where: { id: params.id },
      include: { evidences: true },
    });
    if (!existing) return NextResponse.json({ error: "Record tidak ditemukan" }, { status: 404 });

    for (const ev of existing.evidences) {
      await deleteWebDecommissionImage(ev.imagePath);
    }
    await prisma.webDecommissionRecord.delete({ where: { id: params.id } });
    await deleteWebDecommissionRecordDir(params.id);

    await recordActivity(req, {
      action: "WEB_DECOMMISSION_DELETE",
      details: `Web Decommissioned: hapus "${existing.platformName}" (${existing.domainUrl})`,
      userId: session.user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
