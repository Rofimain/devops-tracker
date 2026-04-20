import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Topbar } from "@/components/topbar";
import Link from "next/link";
import { timeAgo } from "@/lib/utils";

const PAGE_SIZE = 50;

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
          Riwayat aksi di aplikasi termasuk detail. Total <strong>{total}</strong> entri.
        </p>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Activity log</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              Halaman {page} / {totalPages}
            </span>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Aksi</th>
                  <th>Detail</th>
                  <th>User</th>
                  <th>Project</th>
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
                    <td style={{ fontSize: 12, maxWidth: 360, wordBreak: "break-word" }}>{a.details ?? "—"}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card-body" style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 0 }}>
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
