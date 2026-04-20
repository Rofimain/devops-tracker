import { auth } from "@/lib/auth";
import { canWriteAppData } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/topbar";
import Link from "next/link";
import { timeAgo } from "@/lib/utils";
import { Plus, FileText, Search } from "lucide-react";

export default async function DocsPage({ searchParams }: { searchParams: { category?: string; q?: string } }) {
  const session = await auth();
  const canWrite = canWriteAppData(session?.user?.role);

  const where: any = {};
  if (searchParams.category && searchParams.category !== "ALL") where.category = searchParams.category;
  if (searchParams.q) where.OR = [
    { title: { contains: searchParams.q, mode: "insensitive" } },
    { content: { contains: searchParams.q, mode: "insensitive" } },
  ];

  const [docs, categories] = await Promise.all([
    prisma.doc.findMany({ where, orderBy: { updatedAt: "desc" }, include: { project: { select: { name: true, slug: true } } } }),
    prisma.doc.groupBy({ by: ["category"], where: { category: { not: null } }, _count: { id: true }, orderBy: { _count: { id: "desc" } } }),
  ]);

  return (
    <>
      <Topbar
        title="Documentation"
        action={canWrite ? <Link href="/docs/new" className="btn btn-primary"><Plus size={13} /> New Doc</Link> : undefined}
      />
      <div className="app-content">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <div className="search-bar">
            <Search size={13} style={{ color: "var(--text-muted)" }} />
            <form><input name="q" placeholder="Cari dokumen..." defaultValue={searchParams.q ?? ""} /></form>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[{ label: `All (${docs.length})`, value: "ALL" }, ...categories.map((c) => ({ label: `${c.category} (${c._count.id})`, value: c.category! }))].map((f) => (
              <Link key={f.value} href={f.value === "ALL" ? "/docs" : `/docs?category=${f.value}`} className={`chip ${(searchParams.category ?? "ALL") === f.value ? "active" : ""}`}>{f.label}</Link>
            ))}
          </div>
        </div>

        <div className="card">
          {docs.length === 0 ? (
            <div className="empty-state" style={{ padding: "48px 0" }}>
              <FileText size={32} />
              <div>Belum ada dokumentasi.</div>
              {canWrite ? <Link href="/docs/new" className="btn btn-primary btn-sm">Tulis Dokumentasi Pertama</Link> : null}
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Judul</th>
                    <th>Project</th>
                    <th>Category</th>
                    <th>Tags</th>
                    <th>Updated</th>
                    <th style={{ width: 72 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((doc) => (
                    <tr key={doc.id}>
                      <td style={{ fontWeight: 600, maxWidth: 260 }}>
                        <Link href={`/docs/${doc.id}`} style={{ color: "var(--text-primary)", textDecoration: "none" }}>{doc.title}</Link>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {doc.project ? (
                          <Link href={`/projects/${doc.project.slug}`} style={{ color: "var(--accent)" }}>{doc.project.name}</Link>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                      <td>{doc.category ? <span className="badge badge-blue" style={{ fontSize: 10 }}>{doc.category}</span> : "—"}</td>
                      <td style={{ fontSize: 11, maxWidth: 200 }}>
                        {doc.tags.slice(0, 4).map((t, i) => <span key={i} className="tag">{t}</span>)}
                      </td>
                      <td style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{timeAgo(doc.updatedAt)}</td>
                      <td><Link href={`/docs/${doc.id}`} className="btn btn-sm">Buka</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
