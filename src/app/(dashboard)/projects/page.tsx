import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/topbar";
import Link from "next/link";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/utils";
import { Plus, Search } from "lucide-react";
import { ProjectFilters } from "./project-filters";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
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
      include: { _count: { select: { tools: true, docs: true } } },
    }),
    prisma.project.groupBy({ by: ["status"], _count: { id: true } }),
  ]);

  const countMap: Record<string, number> = { ALL: 0 };
  counts.forEach((c) => { countMap[c.status] = c._count.id; countMap.ALL += c._count.id; });

  const filters = [
    { label: `All (${countMap.ALL ?? 0})`, value: "ALL" },
    { label: `Active (${countMap.ACTIVE ?? 0})`, value: "ACTIVE" },
    { label: `Maintenance (${countMap.MAINTENANCE ?? 0})`, value: "MAINTENANCE" },
    { label: `Deprecated (${countMap.DEPRECATED ?? 0})`, value: "DEPRECATED" },
    { label: `Planning (${countMap.PLANNING ?? 0})`, value: "PLANNING" },
  ];

  return (
    <>
      <Topbar
        title="Projects"
        action={
          <Link href="/projects/new" className="btn btn-primary">
            <Plus size={13} /> Add Project
          </Link>
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
                    <td colSpan={16} style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                      Belum ada project.{" "}
                      <Link href="/projects/new" style={{ color: "var(--accent)" }}>Tambah project pertama →</Link>
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
                      <td><span className={`badge ${STATUS_COLORS[p.status]}`}>{STATUS_LABELS[p.status]}</span></td>
                      <td>{p.platform.map((t, j) => <span key={j} className="tag">{t}</span>)}</td>
                      <td className="col-infra">
                        <span className={`badge ${p.isWebApp ? "badge-green" : "badge-gray"}`}>{p.isWebApp ? "Yes" : "No"}</span>
                      </td>
                      <td className="col-infra mono">{p.targetGroup || "—"}</td>
                      <td className="col-infra mono">{p.loadBalancer || "—"}</td>
                      <td className="col-infra">
                        {[...p.hosting, ...p.cdn].map((h, j) => <span key={j} className="tag">{h}</span>)}
                      </td>
                      <td className="col-infra">
                        {p.databases.map((d, j) => <span key={j} className="tag">{d}</span>)}
                      </td>
                      <td>
                        {p.repoUrl ? (
                          <a href={p.repoUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", fontSize: 11 }}>
                            {p.repoUrl.replace("https://github.com/", "github/")}
                          </a>
                        ) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {p.costPerMonth ? `$${Number(p.costPerMonth).toFixed(0)}` : "—"}
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
