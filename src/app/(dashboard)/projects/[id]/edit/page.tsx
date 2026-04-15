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
  const project = await prisma.project.findUnique({ where: { slug: params.id } });
  if (!project) notFound();

  const defaultValues = sanitize({
    ...project,
    costPerMonth: project.costPerMonth != null && String(project.costPerMonth).trim() !== "" ? String(project.costPerMonth) : undefined,
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
