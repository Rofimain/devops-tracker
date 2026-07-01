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
          Pantau penggunaan disk Synology NAS dan server storage lain — via IP publik, IP lokal, atau DDNS.
          Tidak perlu satu VLAN dengan server web; yang penting server web bisa menjangkau NAS (port DSM di-forward jika perlu).
          {canManage
            ? " Admin dapat menambah/mengubah konfigurasi server di bawah."
            : " Mode baca saja — hubungi Admin untuk mengubah konfigurasi."}
        </div>
        <StorageMonitorView canManage={canManage} />
      </div>
    </>
  );
}
