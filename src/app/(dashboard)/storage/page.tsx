import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canViewStorage, canWriteAppData } from "@/lib/roles";
import { Topbar } from "@/components/topbar";
import { StorageMonitorView } from "./storage-monitor-view";

export default async function StoragePage() {
  const session = await auth();
  if (!session?.user?.role) redirect("/login");
  if (!canViewStorage(session.user.role)) redirect("/");

  const canManage = canWriteAppData(session.user.role);

  return (
    <>
      <Topbar title="Storage Monitor" breadcrumb="Infrastructure" />
      <div className="app-content">
        <div className="alert-info" style={{ marginBottom: 16, fontSize: 12 }}>
          Pantau Synology DSM dan QNAP QTS — via IP publik, lokal, atau DDNS. Keduanya mendukung HTTP dan HTTPS.
          {canManage
            ? " Admin dapat menambah/mengubah konfigurasi server di bawah."
            : " Mode baca saja — hubungi Admin untuk mengubah konfigurasi."}
        </div>
        <StorageMonitorView canManage={canManage} />
      </div>
    </>
  );
}
