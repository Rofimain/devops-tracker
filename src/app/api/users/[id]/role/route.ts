import { NextRequest, NextResponse } from "next/server";
import { auth, isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!isSuperAdmin(session?.user?.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { role } = await req.json();
  if (!["MEMBER", "ADMIN"].includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  const user = await prisma.user.update({ where: { id: params.id }, data: { role } });
  await prisma.activity.create({
    data: { action: "UPDATE", details: `Role user "${user.email}" diubah ke ${role}`, userId: session!.user.id },
  });
  return NextResponse.json(user);
}
