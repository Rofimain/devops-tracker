import { auth, isSuperAdmin } from "@/lib/auth";
import { Topbar } from "@/components/topbar";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const session = await auth();
  if (!isSuperAdmin(session?.user?.role)) redirect("/");

  return (
    <>
      <Topbar title="Settings" />
      <div className="app-content">
        <div className="grid-2">
          {/* General */}
          <div>
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-header"><span className="card-title">General Settings</span></div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">App Name</label>
                  <input className="form-input" defaultValue="DevOps Tracker" disabled />
                </div>
                <div className="form-group">
                  <label className="form-label">Allowed Email Domain</label>
                  <input className="form-input" defaultValue={process.env.ALLOWED_EMAIL_DOMAIN ?? "company.com"} disabled />
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Diatur via environment variable <code style={{ fontFamily: "monospace" }}>ALLOWED_EMAIL_DOMAIN</code></div>
                </div>
                <div className="form-group">
                  <label className="form-label">Super Admin Email</label>
                  <input className="form-input" defaultValue={process.env.SUPER_ADMIN_EMAIL ?? ""} disabled />
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Diatur via environment variable <code style={{ fontFamily: "monospace" }}>SUPER_ADMIN_EMAIL</code></div>
                </div>
                <div className="alert-info" style={{ marginTop: 8, marginBottom: 0 }}>
                  Untuk mengubah konfigurasi, edit file <code style={{ fontFamily: "monospace" }}>.env</code> di server dan restart container.
                </div>
              </div>
            </div>
          </div>

          {/* Auth & Security */}
          <div>
            <div className="card" style={{ marginBottom: 14 }}>
              <div className="card-header"><span className="card-title">Auth & Security</span></div>
              <div>
                {[
                  { label: "Google OAuth Login", desc: "Login via Google Workspace", status: "Enabled" },
                  { label: "Email Domain Restriction", desc: `Hanya @${process.env.ALLOWED_EMAIL_DOMAIN}`, status: "Active" },
                  { label: "Activity Logging", desc: "Catat semua aksi user", status: "Enabled" },
                  { label: "Session Provider", desc: "NextAuth.js v5 (Auth.js)", status: "Active" },
                ].map((item, i, arr) => (
                  <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{item.label}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.desc}</div>
                    </div>
                    <span className="badge badge-green">{item.status}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><span className="card-title">System Info</span></div>
              <div>
                {[
                  { label: "Framework", value: "Next.js 14 (App Router)" },
                  { label: "Database", value: "PostgreSQL + Prisma ORM" },
                  { label: "Auth", value: "NextAuth.js v5 (Auth.js)" },
                  { label: "Deployment", value: "Docker + GitHub Actions" },
                ].map((item, i, arr) => (
                  <div key={item.label} className="info-row" style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <span className="info-label">{item.label}</span>
                    <span className="info-value" style={{ fontWeight: 400 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
