import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { recordActivity } from "@/lib/activity-log";

/** Satu log per sesi browser (dipanggil dari client setelah login) — menyimpan IP asli request. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await recordActivity(req, {
    action: "APP_SESSION",
    details: "Akses dashboard (sesi browser)",
    userId: session.user.id,
  });
  return NextResponse.json({ ok: true });
}
