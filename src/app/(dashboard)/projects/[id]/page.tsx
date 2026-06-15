import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { canWriteAppData } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { statusBadgeClass, statusLabel } from "@/lib/utils";
import { displayExternalUrl, displayRepoUrl, normalizeExternalUrl } from "@/lib/external-url";
import { resolveInfraUrl } from "@/lib/project-env-url";
import { formatUsd, parseCostLineItems, sumCostItems } from "@/lib/project-cost";
import { ProjectDetailTabs } from "./project-detail-tabs";
import { ProjectDetailTopbar } from "./project-detail-topbar";
import { Edit, Plus, Globe, GitBranch, Server, DollarSign, UserRound } from "lucide-react";
import { ProjectDeleteButton } from "./project-delete-button";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const canWrite = canWriteAppData(session?.user?.role);

  const [project, allProjects] = await Promise.all([
    prisma.project.findUnique({
      where: { slug: params.id },
      include: {
        infras: { orderBy: { sortOrder: "asc" } },
        tools: { include: { tool: true }, orderBy: { createdAt: "asc" } },
        docs: { orderBy: { updatedAt: "desc" } },
        activities: { take: 20, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } },
      },
    }),
    prisma.project.findMany({ select: { slug: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!project) notFound();

  const initials = project.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const primaryUrl = resolveInfraUrl(
    "production",
    project.infras.find((i) => i.envName.toLowerCase() === "production")?.url,
    project.url,
  );
  const costTotal = (project.infras ?? []).reduce(
    (sum, inf) => sum + sumCostItems(parseCostLineItems(inf.costItems)),
    0,
  );
  const primaryHosting = (project.infras ?? []).flatMap((i) => i.hosting ?? []).find(Boolean);

  return (
    <>
      <ProjectDetailTopbar
        currentSlug={project.slug}
        currentName={project.name}
        projects={allProjects}
        action={
          canWrite ? (
            <div className="project-topbar-actions">
              <Link href={`/projects/${project.slug}/edit`} className="btn btn-sm">
                <Edit size={12} /> Edit
              </Link>
              <Link href={`/projects/${project.slug}/tools/add`} className="btn btn-primary btn-sm">
                <Plus size={12} /> Add Tool
              </Link>
              <ProjectDeleteButton projectId={project.id} projectName={project.name} />
            </div>
          ) : undefined
        }
      />
      <div className="app-content">
        <div className="detail-header">
          <div className="project-avatar">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="project-detail-title-row">
              <h1 className="project-detail-title">{project.name}</h1>
              <span className={`badge ${statusBadgeClass(project.status)}`}>{statusLabel(project.status)}</span>
            </div>
            <p className="project-detail-desc">
              {project.description?.trim() ? project.description : "Belum ada deskripsi project."}
            </p>
            <div className="project-meta-row">
              {primaryUrl ? (
                <a href={primaryUrl} target="_blank" rel="noopener noreferrer" className="project-meta-chip">
                  <Globe size={12} />
                  {displayExternalUrl(primaryUrl)}
                </a>
              ) : null}
              {project.repoUrl ? (
                <a
                  href={normalizeExternalUrl(project.repoUrl)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="project-meta-chip"
                >
                  <GitBranch size={12} />
                  {displayRepoUrl(project.repoUrl)}
                </a>
              ) : null}
              {primaryHosting ? (
                <span className="project-meta-chip">
                  <Server size={12} />
                  {primaryHosting}
                </span>
              ) : null}
              {costTotal > 0 ? (
                <span className="project-meta-chip">
                  <DollarSign size={12} />
                  {formatUsd(costTotal)}/mo
                </span>
              ) : project.costPerMonth?.trim() ? (
                <span className="project-meta-chip">
                  <DollarSign size={12} />
                  {project.costPerMonth}
                </span>
              ) : null}
              {project.management?.trim() ? (
                <span className="project-meta-chip">
                  <UserRound size={12} />
                  {project.management}
                </span>
              ) : null}
              {project.category ? <span className="badge badge-blue">{project.category}</span> : null}
            </div>
          </div>
        </div>

        <ProjectDetailTabs project={project as any} canWrite={canWrite} />
      </div>
    </>
  );
}
