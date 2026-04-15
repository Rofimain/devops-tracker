import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/topbar";
import Link from "next/link";
import { TOOL_CATEGORY_COLORS } from "@/lib/utils";
import { Plus, ExternalLink } from "lucide-react";
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
      include: { _count: { select: { projects: true } } },
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
          <div className="grid-4">
            {tools.map((tool) => (
              <Link key={tool.id} href={`/tools/${tool.id}`} style={{ textDecoration: "none" }}>
                <div className="card" style={{ padding: 14, cursor: "pointer", transition: "border-color 0.1s" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--bg-subtle)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, marginBottom: 10, color: "var(--text-primary)" }}>
                    {tool.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3, color: "var(--text-primary)" }}>{tool.name}</div>
                  <div style={{ marginBottom: 6 }}>
                    <span className={`badge ${TOOL_CATEGORY_COLORS[tool.category] ?? "badge-gray"}`}>{tool.category}</span>
                  </div>
                  {tool.version && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>v{tool.version}</div>}
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6 }}>Used in {tool._count.projects} project{tool._count.projects !== 1 ? "s" : ""}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
