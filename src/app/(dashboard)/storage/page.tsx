import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canViewStorage, canViewStorageEndpoints, canWriteAppData } from "@/lib/roles";
import { Topbar } from "@/components/topbar";
import { StorageMonitorView } from "./storage-monitor-view";

export default async function StoragePage() {
  const session = await auth();
  if (!session?.user?.role) redirect("/login");
  if (!canViewStorage(session.user.role)) redirect("/");

  const canManage = canWriteAppData(session.user.role);
  const showEndpoints = canViewStorageEndpoints(session.user.role);

  return (
    <>
      <Topbar title="Storage Monitor" breadcrumb="Infrastructure" />
      <div className="app-content">
        <StorageMonitorView canManage={canManage} showEndpoints={showEndpoints} />
      </div>
    </>
  );
}
