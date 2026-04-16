import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/topbar";
import Link from "next/link";
import { TOOL_CATEGORY_COLORS, statusBadgeClass, statusLabel } from "@/lib/utils";
import { ExternalLink, Edit } from "lucide-react";
import { ToolDeleteButton } from "./tool-delete-button";

export default async function ToolDetailPage({ params }: { params: { id: string } }) {
  const tool = await prisma.tool.findUnique({
    where: { id: params.id },
    include: {
      projects: {
        include: { project: { select: { id: true, name: true, slug: true, status: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!tool) notFound();

  return (
    <>
      <Topbar
        title={tool.name}
        breadcrumb="Tools Catalog"
        action={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href={`/tools/${tool.id}/edit`} className="btn btn-sm">
              <Edit size={12} /> Edit
            </Link>
            <ToolDeleteButton toolId={tool.id} toolName={tool.name} usedInProjects={tool.projects.length} />
          </div>
        }
      />
      <div className="app-content">
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          {/* Tool Header */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-body" style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: 10, background: "var(--bg-subtle)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18, color: "var(--text-primary)", flexShrink: 0 }}>
                {tool.name.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 17, fontWeight: 700 }}>{tool.name}</span>
                  <span className={`badge ${TOOL_CATEGORY_COLORS[tool.category] ?? "badge-gray"}`}>{tool.category}</span>
                  {tool.version && <span className="tag mono">v{tool.version}</span>}
                </div>
                {tool.description && <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>{tool.description}</div>}
                <div style={{ display: "flex", gap: 8 }}>
                  {tool.docsUrl && (
                    <a href={tool.docsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm">
                      <ExternalLink size={11} /> Docs
                    </a>
                  )}
                  <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
                    Digunakan di {tool.projects.length} project
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Projects using this tool */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Projects yang Menggunakan Tool Ini</span>
            </div>
            {tool.projects.length === 0 ? (
              <div className="empty-state" style={{ padding: "32px 0" }}>
                <div>Belum ada project yang menggunakan tool ini.</div>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Version di Project</th>
                      <th>Config Notes</th>
                      <th>Status Project</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tool.projects.map((pt) => (
                      <tr key={pt.id}>
                        <td>
                          <Link href={`/projects/${pt.project.slug}`} style={{ fontWeight: 600, color: "var(--text-primary)", textDecoration: "none" }}>
                            {pt.project.name}
                          </Link>
                        </td>
                        <td className="mono">{pt.version || tool.version || "—"}</td>
                        <td style={{ fontSize: 11, color: "var(--text-muted)", maxWidth: 240, whiteSpace: "normal" }}>{pt.notes || "—"}</td>
                        <td>
                          <span className={`badge ${statusBadgeClass(pt.project.status)}`}>{statusLabel(pt.project.status)}</span>
                        </td>
                        <td>
                          <Link href={`/projects/${pt.project.slug}`} className="btn btn-sm">Lihat Project</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
