import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { auth, isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity-log";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSuperAdmin(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (params.id === session.user.id) {
    return NextResponse.json({ error: "Tidak bisa menghapus akun sendiri" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.role === Role.SUPER_ADMIN) {
    return NextResponse.json({ error: "Super Admin tidak bisa dihapus" }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.activity.updateMany({ where: { userId: params.id }, data: { userId: null } });
      await tx.user.delete({ where: { id: params.id } });
    });

    await recordActivity(req, {
      action: "USER_DELETE",
      details: `User dihapus: "${existing.email}" (${existing.role})`,
      userId: session.user.id,
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Gagal menghapus user";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
