import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity-log";

const putSchema = z.object({
  zoneId: z.string().max(200).optional(),
  apiToken: z.string().max(5000).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cfg = await prisma.cloudflareAppConfig.findUnique({ where: { id: "default" } });
  return NextResponse.json({
    zoneId: cfg?.zoneId ?? "",
    hasToken: Boolean(cfg?.apiToken?.trim()),
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const json = await req.json();
    const parsed = putSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

    const zoneId = parsed.data.zoneId?.trim() ?? "";
    const apiToken = parsed.data.apiToken?.trim();

    await prisma.cloudflareAppConfig.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        zoneId,
        apiToken: apiToken ?? "",
      },
      update: {
        ...(parsed.data.zoneId !== undefined ? { zoneId } : {}),
        ...(apiToken !== undefined && apiToken.length > 0 ? { apiToken } : {}),
      },
    });

    const cfg = await prisma.cloudflareAppConfig.findUnique({ where: { id: "default" } });
    await recordActivity(req, {
      action: "SETTINGS_CLOUDFLARE",
      details: `Konfigurasi Cloudflare diperbarui (zone: ${zoneId ? "diisi" : "kosong"}, token: ${apiToken !== undefined && apiToken.length > 0 ? "diperbarui" : "tidak diubah"})`,
      userId: session.user.id,
    });
    return NextResponse.json({
      zoneId: cfg?.zoneId ?? "",
      hasToken: Boolean(cfg?.apiToken?.trim()),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Error" }, { status: 500 });
  }
}
