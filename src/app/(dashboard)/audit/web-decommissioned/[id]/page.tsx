import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canWriteWebDecommissioned } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/topbar";
import { recordToFormValues } from "@/lib/web-decommissioned";
import { WebDecommissionForm } from "../web-decommission-form";

export const dynamic = "force-dynamic";

export default async function WebDecommissionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  let record;
  try {
    record = await prisma.webDecommissionRecord.findUnique({
      where: { id: params.id },
      include: { evidences: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
    });
  } catch (e) {
    console.error("[web-decommissioned detail] prisma error", params.id, e);
    throw e;
  }

  if (!record) notFound();

  const canWrite = canWriteWebDecommissioned(session.user.role);
  const initial = recordToFormValues(record);
  const initialEvidences = record.evidences.map((e) => ({
    id: e.id,
    imageName: e.imageName,
    imageMime: e.imageMime,
    imageSize: e.imageSize,
    sortOrder: e.sortOrder,
  }));

  return (
    <>
      <Topbar title={record.platformName} breadcrumb="Audit" breadcrumbHref="/audit" />
      <div className="app-content">
        <WebDecommissionForm
          mode="edit"
          recordId={record.id}
          initial={initial}
          initialEvidences={initialEvidences}
          canWrite={canWrite}
        />
      </div>
    </>
  );
}
