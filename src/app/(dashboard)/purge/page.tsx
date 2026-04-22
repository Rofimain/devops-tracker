import { redirect } from "next/navigation";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canPurgeCloudflare } from "@/lib/roles";
import { Topbar } from "@/components/topbar";
import { PurgePlayground } from "./purge-playground";

export default async function PurgePage() {
  const session = await auth();
  if (!session?.user?.role) redirect("/login");
  if (!canPurgeCloudflare(session.user.role)) {
    return (
      <>
        <Topbar title="Purge cache Cloudflare" breadcrumb="CDN" />
        <div className="app-content">
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>Akun Anda tidak memiliki akses ke halaman ini.</p>
        </div>
      </>
    );
  }

  const [cfg, presets] = await Promise.all([
    prisma.cloudflareAppConfig.findUnique({ where: { id: "default" } }).catch(() => null),
    prisma.purgePreset.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }).catch(() => []),
  ]);

  return (
    <>
      <Topbar title="Purge cache Cloudflare" breadcrumb="CDN" />
      <div className="app-content">
        <PurgePlayground
          initialZoneId={cfg?.zoneId ?? ""}
          initialHasToken={Boolean(cfg?.apiToken?.trim())}
          initialPresets={presets}
          canConfigure={isAdmin(session.user.role)}
        />
      </div>
    </>
  );
}
