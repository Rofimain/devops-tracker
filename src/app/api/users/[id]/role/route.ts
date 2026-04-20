import { NextRequest, NextResponse } from "next/server";
import { auth, isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity-log";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!isSuperAdmin(session?.user?.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { role } = await req.json();
  if (!["MEMBER", "ADMIN", "OPERATOR"].includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  const user = await prisma.user.update({ where: { id: params.id }, data: { role } });
  await recordActivity(req, {
    action: "USER_ROLE",
    details: `Role user "${user.email}" diubah ke ${role}`,
    userId: session!.user.id,
  });
  return NextResponse.json(user);
}
