import { NextRequest, NextResponse } from "next/server";
import { auth, isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity-log";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!isSuperAdmin(session?.user?.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role === "SUPER_ADMIN") return NextResponse.json({ error: "Tidak perlu" }, { status: 400 });

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: { accountApproved: true },
  });
  await recordActivity(req, {
    action: "USER_APPROVED",
    details: `Akses disetujui untuk "${updated.email}"`,
    userId: session!.user.id,
  });
  return NextResponse.json(updated);
}
