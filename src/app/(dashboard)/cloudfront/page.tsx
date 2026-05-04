import { redirect } from "next/navigation";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canPurgeCloudflare } from "@/lib/roles";
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
  const cfg = await prisma.cloudFrontAppConfig.findUnique({ where: { id: "default" } }).catch(() => null);

  const configured = Boolean(
    cfg?.distributionId?.trim() && cfg?.accessKeyId?.trim() && cfg?.secretAccessKey?.trim(),
  );

  const initialSettings = admin
    ? {
        distributionId: cfg?.distributionId ?? "",
        region: cfg?.region ?? "us-east-1",
        hasAccessKey: Boolean(cfg?.accessKeyId?.trim()),
        hasSecret: Boolean(cfg?.secretAccessKey?.trim()),
      }
    : null;

  const configSummary = {
    distributionId: (cfg?.distributionId ?? "").trim(),
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
          initialSettings={initialSettings}
          configSummary={configSummary}
        />
      </div>
    </>
  );
}
