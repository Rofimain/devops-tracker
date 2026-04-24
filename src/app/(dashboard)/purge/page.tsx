import { redirect } from "next/navigation";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchCloudflareZoneName } from "@/lib/cloudflare-purge";
import { canPurgeCloudflare, isOperatorRole } from "@/lib/roles";
import { Topbar } from "@/components/topbar";
import { PurgeOperatorSimple } from "./purge-operator-simple";
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

  let zoneRootHint: string | null = null;
  const zid = cfg?.zoneId?.trim();
  const tok = cfg?.apiToken?.trim();
  if (zid && tok) {
    const zr = await fetchCloudflareZoneName(zid, tok);
    if ("name" in zr) zoneRootHint = zr.name;
  }

  const operator = isOperatorRole(session.user.role);

  return (
    <>
      <Topbar title="Purge cache Cloudflare" breadcrumb="CDN" />
      <div className="app-content">
        {operator ? (
          <PurgeOperatorSimple initialHasToken={Boolean(tok)} zoneRootHint={zoneRootHint} />
        ) : (
          <PurgePlayground
            initialZoneId={cfg?.zoneId ?? ""}
            initialHasToken={Boolean(tok)}
            initialPresets={presets}
            canConfigure={isAdmin(session.user.role)}
          />
        )}
      </div>
    </>
  );
}
