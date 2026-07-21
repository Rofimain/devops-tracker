import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canWriteWebDecommissioned } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/topbar";
import { recordToFormValues, WebDecommissionForm } from "../web-decommission-form";

export default async function WebDecommissionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const record = await prisma.webDecommissionRecord.findUnique({
    where: { id: params.id },
    include: { evidences: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
  });
  if (!record) notFound();

  const canWrite = canWriteWebDecommissioned(session.user.role);

  return (
    <>
      <Topbar
        title={record.platformName}
        breadcrumb="Audit"
        breadcrumbHref="/audit"
      />
      <div className="app-content">
        <WebDecommissionForm
          mode="edit"
          recordId={record.id}
          initial={recordToFormValues(record)}
          initialEvidences={record.evidences.map((e) => ({
            id: e.id,
            imageName: e.imageName,
            imageMime: e.imageMime,
            imageSize: e.imageSize,
            sortOrder: e.sortOrder,
          }))}
          canWrite={canWrite}
        />
      </div>
    </>
  );
}
