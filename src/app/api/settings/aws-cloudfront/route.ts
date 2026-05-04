import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity-log";

const putSchema = z.object({
  distributionId: z.string().max(100).optional(),
  accessKeyId: z.string().max(200).optional(),
  secretAccessKey: z.string().max(5000).optional(),
  region: z.string().max(30).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cfg = await prisma.cloudFrontAppConfig.findUnique({ where: { id: "default" } });
  return NextResponse.json({
    distributionId: cfg?.distributionId ?? "",
    region: cfg?.region ?? "us-east-1",
    hasAccessKey: Boolean(cfg?.accessKeyId?.trim()),
    hasSecret: Boolean(cfg?.secretAccessKey?.trim()),
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

    const distributionId = parsed.data.distributionId?.trim() ?? "";
    const accessKeyId = parsed.data.accessKeyId?.trim();
    const secretAccessKey = parsed.data.secretAccessKey?.trim();
    const region = parsed.data.region?.trim() ?? "";

    await prisma.cloudFrontAppConfig.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        distributionId,
        accessKeyId: accessKeyId ?? "",
        secretAccessKey: secretAccessKey ?? "",
        region: region || "us-east-1",
      },
      update: {
        ...(parsed.data.distributionId !== undefined ? { distributionId } : {}),
        ...(accessKeyId !== undefined && accessKeyId.length > 0 ? { accessKeyId } : {}),
        ...(secretAccessKey !== undefined && secretAccessKey.length > 0 ? { secretAccessKey } : {}),
        ...(parsed.data.region !== undefined ? { region: region || "us-east-1" } : {}),
      },
    });

    const cfg = await prisma.cloudFrontAppConfig.findUnique({ where: { id: "default" } });
    await recordActivity(req, {
      action: "SETTINGS_AWS_CLOUDFRONT",
      details: `Konfigurasi CloudFront diperbarui (distribution: ${distributionId ? "diisi" : "kosong"}, kunci: ${accessKeyId !== undefined && accessKeyId.length > 0 ? "access key diperbarui" : "tidak diubah"}, secret: ${secretAccessKey !== undefined && secretAccessKey.length > 0 ? "diperbarui" : "tidak diubah"}, region: ${cfg?.region ?? "us-east-1"})`,
      userId: session.user.id,
    });
    return NextResponse.json({
      distributionId: cfg?.distributionId ?? "",
      region: cfg?.region ?? "us-east-1",
      hasAccessKey: Boolean(cfg?.accessKeyId?.trim()),
      hasSecret: Boolean(cfg?.secretAccessKey?.trim()),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
