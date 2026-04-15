import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/topbar";
import Link from "next/link";
import { timeAgo } from "@/lib/utils";
import { Plus, FileText, Search } from "lucide-react";

export default async function DocsPage({ searchParams }: { searchParams: { category?: string; q?: string } }) {
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
        action={<Link href="/docs/new" className="btn btn-primary"><Plus size={13} /> New Doc</Link>}
      />
      <div className="app-content">
        {/* Search + Filters */}
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
              <Link href="/docs/new" className="btn btn-primary btn-sm">Tulis Dokumentasi Pertama</Link>
            </div>
          ) : (
            docs.map((doc) => (
              <Link key={doc.id} href={`/docs/${doc.id}`} className="doc-item" style={{ textDecoration: "none" }}>
                <div className="doc-icon"><FileText size={14} style={{ color: "var(--text-muted)" }} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>{doc.title}</div>
                      <div style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                        {doc.category && <span className="badge badge-blue" style={{ fontSize: 10 }}>{doc.category}</span>}
                        {doc.tags.map((t, i) => <span key={i} className="tag">{t}</span>)}
                        {doc.project && <span className="tag">📁 {doc.project.name}</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0, marginLeft: 12 }}>{timeAgo(doc.updatedAt)}</span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </>
  );
}
