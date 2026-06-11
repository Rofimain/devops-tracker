import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { canWriteAppData } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/topbar";
import Link from "next/link";
import { statusBadgeClass, statusLabel, TOOL_CATEGORY_COLORS, timeAgo } from "@/lib/utils";
import { displayExternalUrl, displayRepoUrl, normalizeExternalUrl } from "@/lib/external-url";
import { ProjectDetailTabs } from "./project-detail-tabs";
import { Edit, Plus, ExternalLink } from "lucide-react";
import { ProjectDeleteButton } from "./project-delete-button";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const canWrite = canWriteAppData(session?.user?.role);

  const project = await prisma.project.findUnique({
    where: { slug: params.id },
    include: {
      infras: { orderBy: { sortOrder: "asc" } },
      tools: { include: { tool: true }, orderBy: { createdAt: "asc" } },
      docs: { orderBy: { updatedAt: "desc" } },
      activities: { take: 20, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } },
    },
  });
  if (!project) notFound();

  const initials = project.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <>
      <Topbar
        title={project.name}
        breadcrumb="Projects"
        action={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span className={`badge ${statusBadgeClass(project.status)}`}>{statusLabel(project.status)}</span>
            {canWrite ? (
              <>
                <Link href={`/projects/${project.slug}/edit`} className="btn btn-sm"><Edit size={12} /> Edit</Link>
                <Link href={`/projects/${project.slug}/tools/add`} className="btn btn-primary btn-sm"><Plus size={12} /> Add Tool</Link>
                <ProjectDeleteButton projectId={project.id} projectName={project.name} />
              </>
            ) : null}
          </div>
        }
      />
      <div className="app-content">

        {/* Detail Header */}
        <div className="detail-header">
          <div className="project-avatar">{initials}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 3 }}>{project.name}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>{project.description ?? "No description."}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {project.url && (
                <a href={normalizeExternalUrl(project.url)!} target="_blank" rel="noopener noreferrer" className="tag" style={{ color: "var(--accent)", display: "flex", alignItems: "center", gap: 3 }}>
                  🌐 {displayExternalUrl(project.url)}
                  <ExternalLink size={9} />
                </a>
              )}
              {project.repoUrl && (
                <a href={normalizeExternalUrl(project.repoUrl)!} target="_blank" rel="noopener noreferrer" className="tag" style={{ color: "var(--accent)", display: "flex", alignItems: "center", gap: 3 }}>
                  📦 {displayRepoUrl(project.repoUrl)}
                  <ExternalLink size={9} />
                </a>
              )}
              {(project.infras ?? [])[0]?.hosting?.[0] && <span className="tag">🖥 {(project.infras ?? [])[0].hosting[0]}</span>}
              {project.costPerMonth?.trim() && <span className="tag">💰 {project.costPerMonth}</span>}
              {project.management && <span className="tag">👤 {project.management}</span>}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <ProjectDetailTabs project={project as any} canWrite={canWrite} />

      </div>
    </>
  );
}
