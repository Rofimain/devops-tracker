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

  let defaultZoneRootHint: string | null = null;
  const defaultZ = cfg?.zoneId?.trim() ?? "";
  const tok = cfg?.apiToken?.trim();
  const zoneNameById = new Map<string, string | null>();
  if (defaultZ && tok) {
    const zr = await fetchCloudflareZoneName(defaultZ, tok);
    if ("name" in zr) {
      defaultZoneRootHint = zr.name;
      zoneNameById.set(defaultZ, zr.name);
    } else {
      zoneNameById.set(defaultZ, null);
    }
  }

  if (tok) {
    const uniqueIds = Array.from(
      new Set(presets.map((p) => (p.zoneId?.trim() || defaultZ).trim()).filter((id): id is string => Boolean(id)))
    );
    for (const id of uniqueIds) {
      if (zoneNameById.has(id)) continue;
      const zr = await fetchCloudflareZoneName(id, tok);
      zoneNameById.set(id, "name" in zr ? zr.name : null);
    }
  }

  const presetRows = presets
    .map((p) => {
      const effectiveZoneId = (p.zoneId?.trim() || defaultZ).trim();
      return {
        id: p.id,
        name: p.name,
        bodyJson: p.bodyJson,
        effectiveZoneId,
        zoneLabel: effectiveZoneId ? zoneNameById.get(effectiveZoneId) ?? null : null,
      };
    })
    .filter((r) => r.effectiveZoneId);

  const operator = isOperatorRole(session.user.role);

  return (
    <>
      <Topbar title="Purge cache Cloudflare" breadcrumb="CDN" />
      <div className="app-content">
        {operator ? (
          <PurgeOperatorSimple
            initialHasToken={Boolean(tok)}
            defaultZoneId={defaultZ}
            defaultZoneRootHint={defaultZoneRootHint}
            presetRows={presetRows}
          />
        ) : (
          <PurgePlayground
            initialZoneId={defaultZ}
            initialHasToken={Boolean(tok)}
            initialPresets={presets}
            canConfigure={isAdmin(session.user.role)}
          />
        )}
      </div>
    </>
  );
}
