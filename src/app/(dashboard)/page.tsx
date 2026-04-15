import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/topbar";
import Link from "next/link";
import { timeAgo, statusBadgeClass, statusLabel } from "@/lib/utils";
import { Plus } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();

  const [projectCount, toolCount, docCount, userCount, projects, activities, hostingStats, dbStats] =
    await Promise.all([
      prisma.project.count(),
      prisma.tool.count(),
      prisma.doc.count(),
      prisma.user.count(),
      prisma.project.findMany({
        take: 6,
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true, slug: true, url: true, status: true, platform: true, hosting: true },
      }),
      prisma.activity.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true } }, project: { select: { name: true } } },
      }),
      prisma.project.findMany({ select: { hosting: true } }),
      prisma.project.findMany({ select: { databases: true } }),
    ]);

  // Compute hosting distribution
  const hostingMap: Record<string, number> = {};
  hostingStats.forEach((p) => p.hosting.forEach((h) => {
    const key = h.toLowerCase().includes("aws") ? "AWS" : h.toLowerCase().includes("gcp") ? "GCP" : h.toLowerCase().includes("azure") ? "Azure" : "VPS/Other";
    hostingMap[key] = (hostingMap[key] ?? 0) + 1;
  }));

  // Compute DB distribution
  const dbMap: Record<string, number> = {};
  dbStats.forEach((p) => p.databases.forEach((d) => {
    const key = d.toLowerCase().includes("postgres") ? "PostgreSQL" : d.toLowerCase().includes("mysql") ? "MySQL" : d.toLowerCase().includes("mongo") ? "MongoDB" : d.split(" ")[0];
    dbMap[key] = (dbMap[key] ?? 0) + 1;
  }));

  const activeCount = projects.filter((p) => p.status === "ACTIVE").length;
  const maintenanceCount = projects.filter((p) => p.status === "MAINTENANCE").length;

  const activityColors: Record<string, string> = {
    CREATE: "var(--green)",
    UPDATE: "var(--accent)",
    DELETE: "var(--red)",
    ADD_TOOL: "var(--purple)",
    ADD_DOC: "var(--accent)",
    INVITE: "var(--yellow)",
  };

  return (
    <>
      <Topbar
        title="Dashboard"
        action={
          <Link href="/projects/new" className="btn btn-primary">
            <Plus size={13} /> New Project
          </Link>
        }
      />
      <div className="app-content">

        {/* Stats */}
        <div className="grid-stats">
          <div className="stat-card">
            <div className="stat-label">Total Projects</div>
            <div className="stat-value">{projectCount}</div>
            <div className="stat-meta">
              <span className="stat-dot" style={{ background: "var(--green)" }} />
              {activeCount} active · {maintenanceCount} maintenance
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Tools Registered</div>
            <div className="stat-value">{toolCount}</div>
            <div className="stat-meta">
              <span className="stat-dot" style={{ background: "var(--accent)" }} />
              Across all projects
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Dokumentasi</div>
            <div className="stat-value">{docCount}</div>
            <div className="stat-meta">
              <span className="stat-dot" style={{ background: "var(--purple)" }} />
              All categories
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Team Members</div>
            <div className="stat-value">{userCount}</div>
            <div className="stat-meta">
              <span className="stat-dot" style={{ background: "var(--yellow)" }} />
              Active users
            </div>
          </div>
        </div>

        <div className="grid-2">
          {/* Recent Projects */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Status Projects</span>
              <Link href="/projects" className="btn btn-sm">Lihat semua →</Link>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Platform</th>
                    <th>Hosting</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px 0" }}>Belum ada project. <Link href="/projects/new" style={{ color: "var(--accent)" }}>Buat project pertama →</Link></td></tr>
                  ) : (
                    projects.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <Link href={`/projects/${p.slug}`} style={{ fontWeight: 600, color: "var(--text-primary)", textDecoration: "none" }}>{p.name}</Link>
                          {p.url && <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{p.url.replace("https://", "").replace("http://", "")}</div>}
                        </td>
                        <td>{p.platform.slice(0, 2).map((t, i) => <span key={i} className="tag">{t}</span>)}</td>
                        <td>{p.hosting.slice(0, 1).map((h, i) => <span key={i} className="tag">{h}</span>)}</td>
                        <td>
                          <span className={`badge ${statusBadgeClass(p.status)}`}>{statusLabel(p.status)}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card">
            <div className="card-header"><span className="card-title">Recent Activity</span></div>
            <div className="card-body">
              {activities.length === 0 ? (
                <div className="empty-state" style={{ padding: "24px 0" }}>Belum ada aktivitas.</div>
              ) : (
                activities.map((a) => (
                  <div key={a.id} className="activity-item">
                    <div className="activity-dot" style={{ background: activityColors[a.action] ?? "var(--accent)" }} />
                    <div>
                      <div style={{ fontSize: 12, color: "var(--text-primary)" }}>{a.details}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        {a.user?.name ?? "System"} · {timeAgo(a.createdAt)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Infra Overview */}
        <div className="card" style={{ marginTop: 14 }}>
          <div className="card-header"><span className="card-title">Infrastruktur Overview</span></div>
          <div className="card-body">
            <div className="grid-3">
              <div>
                <div className="sec-label">Hosting Distribution</div>
                {Object.entries(hostingMap).length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Belum ada data.</div>
                ) : (
                  Object.entries(hostingMap).map(([k, v]) => {
                    const max = Math.max(...Object.values(hostingMap));
                    return (
                      <div key={k} style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-secondary)", marginBottom: 3 }}>
                          <span>{k}</span><span>{v} project</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${(v / max) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div>
                <div className="sec-label">Database Types</div>
                {Object.entries(dbMap).length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Belum ada data.</div>
                ) : (
                  Object.entries(dbMap).map(([k, v]) => {
                    const max = Math.max(...Object.values(dbMap));
                    const colors = ["var(--accent)", "var(--green)", "var(--yellow)", "var(--purple)"];
                    const idx = Object.keys(dbMap).indexOf(k);
                    return (
                      <div key={k} style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-secondary)", marginBottom: 3 }}>
                          <span>{k}</span><span>{v}</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${(v / max) * 100}%`, background: colors[idx % colors.length] }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div>
                <div className="sec-label">Quick Links</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <Link href="/projects/new" className="btn btn-sm" style={{ justifyContent: "flex-start" }}>+ Tambah Project</Link>
                  <Link href="/tools" className="btn btn-sm" style={{ justifyContent: "flex-start" }}>🔧 Tools Catalog</Link>
                  <Link href="/docs" className="btn btn-sm" style={{ justifyContent: "flex-start" }}>📄 Documentation</Link>
                  <Link href="/admin/users" className="btn btn-sm" style={{ justifyContent: "flex-start" }}>👥 Manage Users</Link>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
