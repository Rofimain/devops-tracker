import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/topbar";
import { ProjectForm } from "../../project-form";

export default async function EditProjectPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { slug: params.id } });
  if (!project) notFound();

  return (
    <>
      <Topbar title={`Edit: ${project.name}`} breadcrumb="Projects" />
      <div className="app-content">
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <ProjectForm mode="edit" defaultValues={{ ...project, costPerMonth: project.costPerMonth ? Number(project.costPerMonth) : null }} />
        </div>
      </div>
    </>
  );
}
