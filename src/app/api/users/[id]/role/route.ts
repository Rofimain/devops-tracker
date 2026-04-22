import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { auth, isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity-log";

const ASSIGNABLE: Role[] = [Role.MEMBER, Role.ADMIN, Role.OPERATOR];

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!isSuperAdmin(session?.user?.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const role = body?.role as string | undefined;
  if (!role || !ASSIGNABLE.includes(role as Role)) {
    return NextResponse.json({ error: "Role tidak valid (MEMBER, ADMIN, atau OPERATOR)" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.role === Role.SUPER_ADMIN) {
    return NextResponse.json({ error: "Role Super Admin tidak bisa diubah dari sini" }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({ where: { id: params.id }, data: { role: role as Role } });
    await recordActivity(req, {
      action: "USER_ROLE",
      details: `Role user "${user.email}" diubah ke ${role}`,
      userId: session!.user.id,
    });
    return NextResponse.json(user);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Gagal menyimpan";
    if (msg.includes("invalid input value for enum") || msg.includes("22P02")) {
      return NextResponse.json(
        { error: "Database enum Role belum punya OPERATOR. Restart app / jalankan migrasi agar skema DB diselaraskan." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
