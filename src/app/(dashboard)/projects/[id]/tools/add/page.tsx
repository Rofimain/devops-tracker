import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/topbar";
import { AddToolForm } from "./add-tool-form";

export default async function AddToolPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { slug: params.id } });
  if (!project) notFound();

  const allTools = await prisma.tool.findMany({ orderBy: { name: "asc" } });
  const existingToolIds = (await prisma.projectTool.findMany({ where: { projectId: project.id }, select: { toolId: true } })).map((t) => t.toolId);
  const availableTools = allTools.filter((t) => !existingToolIds.includes(t.id));

  return (
    <>
      <Topbar title="Add Tool" breadcrumb={project.name} />
      <div className="app-content">
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <AddToolForm projectId={project.id} projectSlug={project.slug} tools={availableTools} />
        </div>
      </div>
    </>
  );
}
