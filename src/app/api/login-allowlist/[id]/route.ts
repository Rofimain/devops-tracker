import { NextRequest, NextResponse } from "next/server";
import { auth, isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity-log";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!isSuperAdmin(session?.user?.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const row = await prisma.loginAllowlist.delete({ where: { id: params.id } });
    await recordActivity(req, {
      action: "REMOVE_ALLOWLIST",
      details: `Email dihapus dari undangan: ${row.email}`,
      userId: session!.user.id,
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
