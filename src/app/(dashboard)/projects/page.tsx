import { auth } from "@/lib/auth";
import { canWriteAppData } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/topbar";
import Link from "next/link";
import { statusBadgeClass, statusLabel, webBasedBadgeClass } from "@/lib/utils";
import { Plus, Search } from "lucide-react";
import { ProjectFilters } from "./project-filters";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const session = await auth();
  const canWrite = canWriteAppData(session?.user?.role);

  const where: any = {};
  if (searchParams.status && searchParams.status !== "ALL") where.status = searchParams.status;
  if (searchParams.q) {
    where.OR = [
      { name: { contains: searchParams.q, mode: "insensitive" } },
      { url: { contains: searchParams.q, mode: "insensitive" } },
      { description: { contains: searchParams.q, mode: "insensitive" } },
    ];
  }

  const [projects, counts] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { tools: true, docs: true } }, infras: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.project.groupBy({ by: ["status"], _count: { id: true } }),
  ]);

  const countMap: Record<string, number> = { ALL: 0 };
  counts.forEach((c) => { countMap[c.status] = c._count.id; countMap.ALL += c._count.id; });

  const presetOrder = ["ACTIVE", "MAINTENANCE", "DEPRECATED", "PLANNING"];
  const distinctStatuses = counts.map((c) => c.status).filter(Boolean);
  const orderedStatuses = [
    ...presetOrder.filter((s) => distinctStatuses.includes(s)),
    ...distinctStatuses.filter((s) => !presetOrder.includes(s)).sort((a, b) => a.localeCompare(b)),
  ];
  const filters = [
    { label: `All (${countMap.ALL ?? 0})`, value: "ALL" },
    ...orderedStatuses.map((s) => ({
      label: `${statusLabel(s)} (${countMap[s] ?? 0})`,
      value: s,
    })),
  ];

  return (
    <>
      <Topbar
        title="Projects"
        action={
          canWrite ? (
            <Link href="/projects/new" className="btn btn-primary">
              <Plus size={13} /> Add Project
            </Link>
          ) : undefined
        }
      />
      <div className="app-content">
        <ProjectFilters filters={filters} currentStatus={searchParams.status ?? "ALL"} currentQ={searchParams.q ?? ""} />

        <div className="card">
          <div className="card-header">
            <span className="card-title">Semua Projects</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{projects.length} project{projects.length !== 1 ? "s" : ""} terdaftar</span>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 32 }}>No.</th>
                  <th>Site Name</th>
                  <th>URL</th>
                  <th style={{ maxWidth: 180 }}>Description</th>
                  <th>Category</th>
                  <th>Management</th>
                  <th>Status</th>
                  <th>Platform / Tech</th>
                  <th className="col-infra">Web App</th>
                  <th className="col-infra">Environment</th>
                  <th className="col-infra">Target Group</th>
                  <th className="col-infra">Load Balancer</th>
                  <th className="col-infra">Hosting / CDN</th>
                  <th className="col-infra">Database</th>
                  <th>Repository</th>
                  <th>Cost/mo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={17} style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                      Belum ada project.{canWrite ? <> <Link href="/projects/new" style={{ color: "var(--accent)" }}>Tambah project pertama →</Link></> : null}
                    </td>
                  </tr>
                ) : (
                  projects.map((p, i) => (
                    <tr key={p.id}>
                      <td style={{ color: "var(--text-muted)" }}>{i + 1}</td>
                      <td>
                        <Link href={`/projects/${p.slug}`} style={{ fontWeight: 600, color: "var(--text-primary)", textDecoration: "none", whiteSpace: "nowrap" }}>{p.name}</Link>
                      </td>
                      <td>
                        {p.url ? (
                          <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", fontSize: 11 }}>
                            {p.url.replace(/^https?:\/\//, "")}
                          </a>
                        ) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>
                      <td style={{ maxWidth: 180, whiteSpace: "normal", fontSize: 11, color: "var(--text-muted)" }}>{p.description ?? "—"}</td>
                      <td>
                        {p.category ? <span className="badge badge-blue">{p.category}</span> : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>
                      <td style={{ fontSize: 12 }}>{p.management ?? "—"}</td>
                      <td>
                        <span className={`badge ${statusBadgeClass(p.status)}`}>{statusLabel(p.status)}</span>
                      </td>
                      <td>{(p.platform ?? []).map((t, j) => <span key={j} className="tag">{t}</span>)}</td>
                      <td className="col-infra">
                        <span className={`badge ${webBasedBadgeClass(p.webBasedApp)}`}>{p.webBasedApp}</span>
                      </td>
                      <td className="col-infra">
                        {(p.infras ?? []).length === 0 ? (
                          "—"
                        ) : (
                          (p.infras ?? []).map((inf) => (
                            <span key={inf.id} className="badge badge-blue" style={{ marginRight: 4, marginBottom: 4, fontSize: 10, textTransform: "capitalize" }}>
                              {inf.envName}
                            </span>
                          ))
                        )}
                      </td>
                      <td className="col-infra mono">{(p.infras ?? [])[0]?.targetGroup || "—"}</td>
                      <td className="col-infra mono">{(p.infras ?? [])[0]?.loadBalancer || "—"}</td>
                      <td className="col-infra">
                        {(p.infras ?? []).length === 0
                          ? "—"
                          : [...((p.infras ?? [])[0]?.hosting ?? []), ...((p.infras ?? [])[0]?.cdn ?? [])].map((h, j) => <span key={j} className="tag">{h}</span>)}
                      </td>
                      <td className="col-infra">
                        {(p.infras ?? []).length === 0
                          ? "—"
                          : ((p.infras ?? [])[0]?.databases ?? []).length === 0
                            ? "—"
                            : ((p.infras ?? [])[0]?.databases ?? []).map((d, j) => <span key={j} className="tag">{d}</span>)}
                      </td>
                      <td>
                        {p.repoUrl ? (
                          <a href={p.repoUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", fontSize: 11 }}>
                            {p.repoUrl.replace("https://github.com/", "github/")}
                          </a>
                        ) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {p.costPerMonth?.trim() ? p.costPerMonth : "—"}
                      </td>
                      <td>
                        <Link href={`/projects/${p.slug}`} className="btn btn-sm">Detail</Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
