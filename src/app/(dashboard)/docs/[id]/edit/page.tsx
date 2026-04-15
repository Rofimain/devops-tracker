import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/topbar";
import { DocForm } from "../../doc-form";

export default async function EditDocPage({ params }: { params: { id: string } }) {
  const doc = await prisma.doc.findUnique({ where: { id: params.id } });
  if (!doc) notFound();

  const projects = await prisma.project.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <Topbar title="Edit Document" breadcrumb="Documentation" />
      <div className="app-content">
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <DocForm
            mode="edit"
            projects={projects}
            defaultValues={{
              id: doc.id,
              title: doc.title,
              content: doc.content,
              category: doc.category ?? "",
              tags: doc.tags.join(", "),
              projectId: doc.projectId ?? "",
            }}
          />
        </div>
      </div>
    </>
  );
}
