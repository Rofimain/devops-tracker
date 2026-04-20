import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity-log";

const patchSchema = z.object({
  category: z.enum(["deployment", "change", "incident", "maintenance", "note"]).optional(),
  title: z.string().min(1).max(200).optional(),
  body: z.string().max(20000).optional(),
  occurredAt: z.coerce.date().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.logbookEntry.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.userId !== session.user.id && !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const json = await req.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const data = parsed.data;
    const entry = await prisma.logbookEntry.update({
      where: { id: params.id },
      data: {
        ...(data.category != null ? { category: data.category } : {}),
        ...(data.title != null ? { title: data.title.trim() } : {}),
        ...(data.body != null ? { body: data.body.trim() } : {}),
        ...(data.occurredAt != null && !Number.isNaN(data.occurredAt.getTime()) ? { occurredAt: data.occurredAt } : {}),
      },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
    });
    await recordActivity(req, {
      action: "LOGBOOK_UPDATE",
      details: `Logbook diubah: "${entry.title}"`,
      userId: session.user.id,
    });
    return NextResponse.json(entry);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.logbookEntry.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.userId !== session.user.id && !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await recordActivity(req, {
    action: "LOGBOOK_DELETE",
    details: `Logbook dihapus: "${existing.title}"`,
    userId: session.user.id,
  });
  await prisma.logbookEntry.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
