import { auth } from "@/lib/auth";
import { canWriteAppData } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/topbar";
import Link from "next/link";
import { displayExternalUrl, normalizeExternalUrl } from "@/lib/external-url";
import { statusBadgeClass, statusLabel } from "@/lib/utils";
import { Plus } from "lucide-react";
import { ProjectFilters } from "./project-filters";
import { parseProjectSort } from "./project-sort";
import { ProjectSortableTh } from "./project-table-head";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string; sort?: string; dir?: string };
}) {
  const session = await auth();
  const canWrite = canWriteAppData(session?.user?.role);
  const sortState = { status: searchParams.status, q: searchParams.q, sort: searchParams.sort, dir: searchParams.dir };
  const { orderBy } = parseProjectSort(searchParams.sort, searchParams.dir);

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
      orderBy,
      select: {
        id: true,
        slug: true,
        name: true,
        url: true,
        description: true,
        category: true,
        management: true,
        status: true,
      },
    }),
    prisma.project.groupBy({ by: ["status"], _count: { id: true } }),
  ]);

  const countMap: Record<string, number> = { ALL: 0 };
  counts.forEach((c) => {
    countMap[c.status] = c._count.id;
    countMap.ALL += c._count.id;
  });

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
        <ProjectFilters
          filters={filters}
          currentStatus={searchParams.status ?? "ALL"}
          currentQ={searchParams.q ?? ""}
          currentSort={searchParams.sort}
          currentDir={searchParams.dir}
        />

        <div className="card">
          <div className="card-header">
            <span className="card-title">Semua Projects</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {projects.length} project{projects.length !== 1 ? "s" : ""} terdaftar
            </span>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>No.</th>
                  <ProjectSortableTh column="name" current={sortState} />
                  <ProjectSortableTh column="url" current={sortState} />
                  <ProjectSortableTh column="description" current={sortState} style={{ minWidth: 160 }} />
                  <ProjectSortableTh column="category" current={sortState} />
                  <ProjectSortableTh column="management" current={sortState} />
                  <ProjectSortableTh column="status" current={sortState} />
                  <th style={{ width: 120 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                      Belum ada project.
                      {canWrite ? (
                        <>
                          {" "}
                          <Link href="/projects/new" style={{ color: "var(--accent)" }}>
                            Tambah project pertama →
                          </Link>
                        </>
                      ) : null}
                    </td>
                  </tr>
                ) : (
                  projects.map((p, i) => (
                    <tr key={p.id}>
                      <td style={{ color: "var(--text-muted)" }}>{i + 1}</td>
                      <td>
                        <Link
                          href={`/projects/${p.slug}`}
                          style={{ fontWeight: 600, color: "var(--text-primary)", textDecoration: "none" }}
                        >
                          {p.name}
                        </Link>
                      </td>
                      <td>
                        {p.url ? (
                          <a
                            href={normalizeExternalUrl(p.url)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "var(--accent)", fontSize: 12 }}
                          >
                            {displayExternalUrl(p.url)}
                          </a>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                      <td style={{ maxWidth: 220, whiteSpace: "normal", fontSize: 12, color: "var(--text-secondary)" }}>
                        {p.description?.trim() ? p.description : "—"}
                      </td>
                      <td>
                        {p.category ? (
                          <span className="badge badge-blue">{p.category}</span>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                      <td style={{ fontSize: 12 }}>{p.management?.trim() ? p.management : "—"}</td>
                      <td>
                        <span className={`badge ${statusBadgeClass(p.status)}`}>{statusLabel(p.status)}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <Link href={`/projects/${p.slug}`} className="btn btn-sm">
                            Detail
                          </Link>
                          {canWrite ? (
                            <Link href={`/projects/${p.slug}/edit`} className="btn btn-sm">
                              Edit
                            </Link>
                          ) : null}
                        </div>
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
