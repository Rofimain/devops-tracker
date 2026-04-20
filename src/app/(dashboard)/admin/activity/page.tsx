import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Topbar } from "@/components/topbar";
import Link from "next/link";
import { timeAgo } from "@/lib/utils";

const PAGE_SIZE = 50;

function uaShort(ua: string | null | undefined, max = 72) {
  if (!ua) return "—";
  const t = ua.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export default async function AdminActivityPage({ searchParams }: { searchParams: { page?: string } }) {
  const session = await auth();
  if (!isAdmin(session?.user?.role)) redirect("/");

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [total, activities] = await Promise.all([
    prisma.activity.count(),
    prisma.activity.findMany({
      skip,
      take: PAGE_SIZE,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        project: { select: { id: true, name: true, slug: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <Topbar title="Log aktivitas" breadcrumb="Admin" />
      <div className="app-content">
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
          Riwayat aksi di aplikasi (API, konfigurasi, data) termasuk alamat IP dan ringkasan browser. Total <strong>{total}</strong> entri.
        </p>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Activity log</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              Halaman {page} / {totalPages}
            </span>
          </div>

          <div className="table-wrap activity-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Aksi</th>
                  <th>Detail</th>
                  <th>User</th>
                  <th>Project</th>
                  <th>IP</th>
                  <th>User-Agent</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                      {new Date(a.createdAt).toLocaleString()}
                      <div style={{ fontSize: 10 }}>{timeAgo(a.createdAt)}</div>
                    </td>
                    <td>
                      <span className="badge badge-gray">{a.action}</span>
                    </td>
                    <td style={{ fontSize: 12, maxWidth: 280, wordBreak: "break-word" }}>{a.details ?? "—"}</td>
                    <td style={{ fontSize: 12 }}>{a.user?.name ?? a.user?.email ?? "—"}</td>
                    <td style={{ fontSize: 12 }}>
                      {a.project ? (
                        <Link href={`/projects/${a.project.slug}`} style={{ color: "var(--accent)" }}>
                          {a.project.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="mono" style={{ fontSize: 11 }}>
                      {a.ipAddress ?? "—"}
                    </td>
                    <td style={{ fontSize: 10, color: "var(--text-muted)", maxWidth: 200 }} title={a.userAgent ?? ""}>
                      {uaShort(a.userAgent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="activity-cards-mobile">
            {activities.map((a) => (
              <div key={a.id} className="activity-card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <span className="badge badge-gray">{a.action}</span>
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{timeAgo(a.createdAt)}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>{new Date(a.createdAt).toLocaleString()}</div>
                <div style={{ fontSize: 12, marginTop: 8, lineHeight: 1.45 }}>{a.details ?? "—"}</div>
                <div style={{ fontSize: 11, marginTop: 8, color: "var(--text-secondary)" }}>
                  <strong>User:</strong> {a.user?.name ?? a.user?.email ?? "—"}
                </div>
                {a.project ? (
                  <div style={{ fontSize: 11, marginTop: 4 }}>
                    <strong>Project:</strong>{" "}
                    <Link href={`/projects/${a.project.slug}`} style={{ color: "var(--accent)" }}>
                      {a.project.name}
                    </Link>
                  </div>
                ) : null}
                <div style={{ fontSize: 11, marginTop: 6 }} className="mono">
                  <strong>IP:</strong> {a.ipAddress ?? "—"}
                </div>
                <div style={{ fontSize: 10, marginTop: 4, color: "var(--text-muted)", wordBreak: "break-all" }} title={a.userAgent ?? ""}>
                  <strong>UA:</strong> {uaShort(a.userAgent, 120)}
                </div>
              </div>
            ))}
          </div>

          <div className="card-body" style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap", paddingTop: 0 }}>
            {page > 1 ? (
              <Link href={`/admin/activity?page=${page - 1}`} className="btn btn-sm">
                ← Sebelumnya
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link href={`/admin/activity?page=${page + 1}`} className="btn btn-sm">
                Berikutnya →
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
