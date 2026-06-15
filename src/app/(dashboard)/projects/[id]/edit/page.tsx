import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ProjectForm } from "../../project-form";
import { ProjectDetailTopbar } from "../project-detail-topbar";

function sanitize<T extends Record<string, any>>(obj: T) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v === null ? undefined : v])) as T;
}

export default async function EditProjectPage({ params }: { params: { id: string } }) {
  const [project, allProjects] = await Promise.all([
    prisma.project.findUnique({
      where: { slug: params.id },
      include: {
        infras: { orderBy: { sortOrder: "asc" } },
        tools: { select: { toolId: true } },
        docs: { select: { id: true } },
      },
    }),
    prisma.project.findMany({ select: { slug: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!project) notFound();

  const { infras: prismaInfras, tools: projectTools, docs: projectDocs, ...proj } = project;
  const defaultValues = sanitize({
    ...proj,
    costPerMonth:
      project.costPerMonth != null && String(project.costPerMonth).trim() !== "" ? String(project.costPerMonth) : undefined,
    toolIds: projectTools.map((t) => t.toolId),
    docIds: projectDocs.map((d) => d.id),
    infras: prismaInfras.map((r) => ({
      envName: r.envName,
      targetGroup: r.targetGroup ?? "",
      loadBalancer: r.loadBalancer ?? "",
      serverIp: r.serverIp ?? "",
      url: r.url ?? (r.envName.toLowerCase() === "production" ? (project.url ?? "") : ""),
      hosting: r.hosting ?? [],
      cdn: r.cdn ?? [],
      databases: r.databases ?? [],
    })),
  });

  return (
    <>
      <ProjectDetailTopbar
        currentSlug={project.slug}
        currentName={project.name}
        projects={allProjects}
        action={
          <Link href={`/projects/${project.slug}`} className="btn btn-sm">
            Kembali ke detail
          </Link>
        }
      />
      <div className="app-content">
        <ProjectForm mode="edit" defaultValues={defaultValues} />
      </div>
    </>
  );
}
