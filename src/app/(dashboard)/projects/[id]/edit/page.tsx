import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/topbar";
import { ProjectForm } from "../../project-form";

// Helper: convert null → undefined agar kompatibel dengan form
function sanitize<T extends Record<string, any>>(obj: T) {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, v === null ? undefined : v])
  ) as T;
}

export default async function EditProjectPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({
    where: { slug: params.id },
    include: {
      infras: { orderBy: { sortOrder: "asc" } },
      tools: { select: { toolId: true } },
      docs: { select: { id: true } },
    },
  });
  if (!project) notFound();

  const { infras: prismaInfras, tools: projectTools, docs: projectDocs, ...proj } = project;
  const defaultValues = sanitize({
    ...proj,
    costPerMonth: project.costPerMonth != null && String(project.costPerMonth).trim() !== "" ? String(project.costPerMonth) : undefined,
    toolIds: projectTools.map((t) => t.toolId),
    docIds: projectDocs.map((d) => d.id),
    infras: prismaInfras.map((r) => ({
      envName: r.envName,
      targetGroup: r.targetGroup ?? "",
      loadBalancer: r.loadBalancer ?? "",
      serverIp: r.serverIp ?? "",
      hosting: r.hosting ?? [],
      cdn: r.cdn ?? [],
      databases: r.databases ?? [],
    })),
  });

  return (
    <>
      <Topbar title={`Edit: ${project.name}`} breadcrumb="Projects" />
      <div className="app-content">
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <ProjectForm mode="edit" defaultValues={defaultValues} />
        </div>
      </div>
    </>
  );
}
