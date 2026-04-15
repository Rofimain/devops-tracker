import { Topbar } from "@/components/topbar";
import { DocForm } from "../doc-form";
import { prisma } from "@/lib/prisma";

export default async function NewDocPage({ searchParams }: { searchParams: { projectId?: string } }) {
  const projects = await prisma.project.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  return (
    <>
      <Topbar title="New Document" breadcrumb="Documentation" />
      <div className="app-content">
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <DocForm mode="create" projects={projects} defaultProjectId={searchParams.projectId} />
        </div>
      </div>
    </>
  );
}
