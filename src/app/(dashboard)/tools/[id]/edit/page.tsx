import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/topbar";
import { EditToolForm } from "./edit-tool-form";

export default async function EditToolPage({ params }: { params: { id: string } }) {
  const tool = await prisma.tool.findUnique({ where: { id: params.id } });
  if (!tool) notFound();

  return (
    <>
      <Topbar title={`Edit: ${tool.name}`} breadcrumb="Tools Catalog" />
      <div className="app-content">
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <EditToolForm tool={tool} />
        </div>
      </div>
    </>
  );
}
