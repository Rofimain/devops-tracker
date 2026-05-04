import { redirect } from "next/navigation";
import { auth, isAdmin } from "@/lib/auth";
import { fetchCloudFrontDistributionLabel } from "@/lib/cloudfront-distribution-label";
import { prisma } from "@/lib/prisma";
import { canPurgeCloudflare, isOperatorRole } from "@/lib/roles";
import { Topbar } from "@/components/topbar";
import { CloudFrontInvalidationClient } from "./cloudfront-invalidation-client";

export default async function CloudFrontPage() {
  const session = await auth();
  if (!session?.user?.role) redirect("/login");
  if (!canPurgeCloudflare(session.user.role)) {
    return (
      <>
        <Topbar title="CloudFront invalidation" breadcrumb="CDN" />
        <div className="app-content">
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>Akun Anda tidak memiliki akses ke halaman ini.</p>
        </div>
      </>
    );
  }

  const admin = isAdmin(session.user.role);
  const operator = isOperatorRole(session.user.role);
  const cfg = await prisma.cloudFrontAppConfig.findUnique({ where: { id: "default" } }).catch(() => null);

  const configured = Boolean(
    cfg?.distributionId?.trim() && cfg?.accessKeyId?.trim() && cfg?.secretAccessKey?.trim(),
  );

  let distributionDescription: string | null = null;
  let distributionDescriptionError: string | null = null;
  if (configured && cfg?.distributionId && cfg?.accessKeyId && cfg?.secretAccessKey) {
    const meta = await fetchCloudFrontDistributionLabel(cfg.distributionId, cfg.accessKeyId, cfg.secretAccessKey);
    distributionDescription = meta.label;
    distributionDescriptionError = meta.fetchError;
  }

  const initialSettings = admin
    ? {
        distributionId: cfg?.distributionId ?? "",
        region: cfg?.region ?? "us-east-1",
        hasAccessKey: Boolean(cfg?.accessKeyId?.trim()),
        hasSecret: Boolean(cfg?.secretAccessKey?.trim()),
      }
    : null;

  const distIdTrim = (cfg?.distributionId ?? "").trim();
  const configSummary = {
    /** Jangan dikirim ke UI untuk operator (jangan tampilkan ID mentah). */
    distributionId: operator ? "" : distIdTrim,
    hasAccessKey: Boolean(cfg?.accessKeyId?.trim()),
    hasSecret: Boolean(cfg?.secretAccessKey?.trim()),
  };

  return (
    <>
      <Topbar title="CloudFront invalidation" breadcrumb="CDN" />
      <div className="app-content">
        <CloudFrontInvalidationClient
          configured={configured}
          canConfigure={admin}
          isOperator={operator}
          distributionDescription={distributionDescription}
          distributionDescriptionError={distributionDescriptionError}
          initialSettings={initialSettings}
          configSummary={configSummary}
        />
      </div>
    </>
  );
}
