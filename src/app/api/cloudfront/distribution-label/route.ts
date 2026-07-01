import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchCloudFrontDistributionLabel } from "@/lib/cloudfront-distribution-label";
import { prisma } from "@/lib/prisma";
import { canPurgeCloudflare } from "@/lib/roles";

/** Deskripsi distribution — dipanggil dari client agar halaman tidak hang saat AWS lambat. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canPurgeCloudflare(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cfg = await prisma.cloudFrontAppConfig.findUnique({ where: { id: "default" } }).catch(() => null);
  const configured = Boolean(
    cfg?.distributionId?.trim() && cfg?.accessKeyId?.trim() && cfg?.secretAccessKey?.trim(),
  );

  if (!configured || !cfg?.distributionId || !cfg?.accessKeyId || !cfg?.secretAccessKey) {
    return NextResponse.json({ label: null, fetchError: null, configured: false });
  }

  const meta = await fetchCloudFrontDistributionLabel(cfg.distributionId, cfg.accessKeyId, cfg.secretAccessKey);
  return NextResponse.json({ ...meta, configured: true });
}
