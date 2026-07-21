import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Topbar } from "@/components/topbar";
import { Archive, ShieldCheck } from "lucide-react";

export default async function AuditIndexPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <>
      <Topbar title="Audit" />
      <div className="app-content">
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-muted)", maxWidth: 640 }}>
          Dokumentasi dan bukti audit infrastruktur: monitoring berkala serta catatan web yang dihapus,
          di-nonaktifkan, atau diarsipkan.
        </p>
        <div className="audit-index-grid">
          <Link href="/audit/report-monitoring" className="audit-index-card">
            <div className="audit-index-icon">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="audit-index-title">Report Monitoring</div>
              <div className="audit-index-desc">
                Checklist pengecekan berkala (bulanan / kuartalan / semester / tahunan) beserta bukti screenshot.
              </div>
            </div>
          </Link>
          <Link href="/audit/web-decommissioned" className="audit-index-card">
            <div className="audit-index-icon">
              <Archive size={20} />
            </div>
            <div>
              <div className="audit-index-title">Web Decommissioned</div>
              <div className="audit-index-desc">
                Dokumentasi internal web yang dihapus, inactive, decommissioned, atau diarsipkan — termasuk multi bukti
                screenshot.
              </div>
            </div>
          </Link>
        </div>
      </div>
    </>
  );
}
