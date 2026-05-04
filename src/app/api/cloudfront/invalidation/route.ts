import { NextRequest, NextResponse } from "next/server";
import { CreateInvalidationCommand, CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity-log";
import { canPurgeCloudflare } from "@/lib/roles";

const MAX_PATHS = 100;

const postSchema = z.object({
  paths: z.array(z.string().min(1).max(2048)).min(1).max(MAX_PATHS),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canPurgeCloudflare(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: `Body tidak valid. Kirim { paths: string[] }, maksimal ${MAX_PATHS} path.` }, { status: 400 });
  }

  const paths = parsed.data.paths.map((p) => p.trim()).filter(Boolean);
  if (paths.length === 0) return NextResponse.json({ error: "Minimal satu path." }, { status: 400 });

  for (const p of paths) {
    if (!p.startsWith("/")) {
      return NextResponse.json({ error: `Path harus diawali "/": ${p.slice(0, 80)}` }, { status: 400 });
    }
  }

  const cfg = await prisma.cloudFrontAppConfig.findUnique({ where: { id: "default" } });
  const distId = cfg?.distributionId?.trim() ?? "";
  const accessKeyId = cfg?.accessKeyId?.trim() ?? "";
  const secretAccessKey = cfg?.secretAccessKey?.trim() ?? "";
  const region = (cfg?.region?.trim() || "us-east-1").slice(0, 30);

  if (!distId || !accessKeyId || !secretAccessKey) {
    return NextResponse.json(
      { error: "CloudFront belum dikonfigurasi (Distribution ID + kunci IAM). Admin dapat mengisi di halaman ini." },
      { status: 400 },
    );
  }

  const callerReference = `devops-tracker-${session.user.id}-${Date.now()}`;

  try {
    const client = new CloudFrontClient({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });

    const out = await client.send(
      new CreateInvalidationCommand({
        DistributionId: distId,
        InvalidationBatch: {
          CallerReference: callerReference,
          Paths: {
            Quantity: paths.length,
            Items: paths,
          },
        },
      }),
    );

    const invId = out.Invalidation?.Id ?? "?";
    await recordActivity(req, {
      action: "CLOUDFRONT_INVALIDATION",
      details: `Invalidation OK id=${invId} distribution=${distId.slice(0, 8)}… paths=${paths.length}`,
      userId: session.user.id,
    });

    return NextResponse.json({
      invalidationId: invId,
      status: out.Invalidation?.Status,
      createTime: out.Invalidation?.CreateTime?.toISOString?.() ?? null,
      paths: paths.length,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "AWS error";
    await recordActivity(req, {
      action: "CLOUDFRONT_INVALIDATION_FAILED",
      details: `Gagal: ${msg.slice(0, 400)}`,
      userId: session.user.id,
    });
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
