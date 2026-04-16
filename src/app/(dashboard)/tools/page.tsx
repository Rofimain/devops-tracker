import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/topbar";
import Link from "next/link";
import { TOOL_CATEGORY_COLORS } from "@/lib/utils";
import { Plus } from "lucide-react";
import { ToolFilters } from "./tool-filters";

export default async function ToolsPage({ searchParams }: { searchParams: { category?: string; q?: string } }) {
  const where: any = {};
  if (searchParams.category && searchParams.category !== "ALL") where.category = searchParams.category;
  if (searchParams.q) where.OR = [
    { name: { contains: searchParams.q, mode: "insensitive" } },
    { description: { contains: searchParams.q, mode: "insensitive" } },
  ];

  const [tools, categories] = await Promise.all([
    prisma.tool.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        _count: { select: { projects: true } },
        projects: { include: { project: { select: { name: true, slug: true } } }, orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.tool.groupBy({ by: ["category"], _count: { id: true }, orderBy: { _count: { id: "desc" } } }),
  ]);

  const catFilters = [
    { label: `All (${tools.length})`, value: "ALL" },
    ...categories.map((c) => ({ label: `${c.category} (${c._count.id})`, value: c.category })),
  ];

  return (
    <>
      <Topbar
        title="Tools Catalog"
        action={<Link href="/tools/new" className="btn btn-primary"><Plus size={13} /> Add Tool</Link>}
      />
      <div className="app-content">
        <ToolFilters filters={catFilters} currentCategory={searchParams.category ?? "ALL"} currentQ={searchParams.q ?? ""} />

        {tools.length === 0 ? (
          <div className="card"><div className="empty-state" style={{ padding: "48px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔧</div>
            <div>Belum ada tool terdaftar.</div>
            <Link href="/tools/new" className="btn btn-primary btn-sm">Tambah Tool Pertama</Link>
          </div></div>
        ) : (
          <div className="card">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tool</th>
                    <th>Category</th>
                    <th>Version</th>
                    <th>Projects</th>
                    <th style={{ width: 80 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {tools.map((tool) => (
                    <tr key={tool.id}>
                      <td>
                        <Link href={`/tools/${tool.id}`} style={{ fontWeight: 600, color: "var(--text-primary)", textDecoration: "none" }}>
                          {tool.name}
                        </Link>
                      </td>
                      <td>
                        <span className={`badge ${TOOL_CATEGORY_COLORS[tool.category] ?? "badge-gray"}`}>{tool.category}</span>
                      </td>
                      <td className="mono" style={{ fontSize: 12 }}>{tool.version ?? "—"}</td>
                      <td style={{ fontSize: 11, maxWidth: 320 }}>
                        {tool.projects.length === 0 ? (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        ) : (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {tool.projects.map((pt) => (
                              <Link
                                key={pt.id}
                                href={`/projects/${pt.project.slug}`}
                                className="tag"
                                style={{ color: "var(--accent)", textDecoration: "none" }}
                              >
                                {pt.project.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        <Link href={`/tools/${tool.id}`} className="btn btn-sm">Detail</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
