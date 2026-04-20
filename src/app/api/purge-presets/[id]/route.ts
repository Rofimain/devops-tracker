import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity-log";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  bodyJson: z.string().min(2).max(10000).optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const json = await req.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

    if (parsed.data.bodyJson != null) {
      try {
        JSON.parse(parsed.data.bodyJson);
      } catch {
        return NextResponse.json({ error: "bodyJson harus JSON valid" }, { status: 400 });
      }
    }

    const preset = await prisma.purgePreset.update({
      where: { id: params.id },
      data: {
        ...(parsed.data.name != null ? { name: parsed.data.name.trim() } : {}),
        ...(parsed.data.bodyJson != null ? { bodyJson: parsed.data.bodyJson.trim() } : {}),
        ...(parsed.data.sortOrder != null ? { sortOrder: parsed.data.sortOrder } : {}),
      },
    });
    await recordActivity(req, {
      action: "PURGE_PRESET_UPDATE",
      details: `Preset purge "${preset.name}" diubah`,
      userId: session.user.id,
    });
    return NextResponse.json(preset);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const existing = await prisma.purgePreset.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await recordActivity(req, {
      action: "PURGE_PRESET_DELETE",
      details: `Preset purge "${existing.name}" dihapus`,
      userId: session.user.id,
    });
    await prisma.purgePreset.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
