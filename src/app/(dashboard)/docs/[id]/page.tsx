import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { canWriteAppData } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/topbar";
import Link from "next/link";
import { timeAgo } from "@/lib/utils";
import { Edit } from "lucide-react";
import { DocDeleteButton } from "./doc-delete-button";
import { DocContentView } from "../doc-content-view";

export default async function DocDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const canWrite = canWriteAppData(session?.user?.role);

  const doc = await prisma.doc.findUnique({ where: { id: params.id }, include: { project: { select: { name: true, slug: true } } } });
  if (!doc) notFound();

  return (
    <>
      <Topbar
        title={doc.title}
        breadcrumb="Documentation"
        action={
          canWrite ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link href={`/docs/${doc.id}/edit`} className="btn btn-sm"><Edit size={12} /> Edit</Link>
              <DocDeleteButton docId={doc.id} title={doc.title} />
            </div>
          ) : undefined
        }
      />
      <div className="app-content">
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div className="card">
            <div className="card-header">
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{doc.title}</div>
                <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  {doc.category && <span className="badge badge-blue">{doc.category}</span>}
                  {doc.contentType !== "TEXT" && (
                    <span className="badge badge-gray">{doc.contentType === "PDF" ? "PDF" : "Word"}</span>
                  )}
                  {doc.tags.map((t, i) => <span key={i} className="tag">{t}</span>)}
                  {doc.project && <Link href={`/projects/${doc.project.slug}`} className="tag" style={{ color: "var(--accent)", textDecoration: "none" }}>📁 {doc.project.name}</Link>}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>Updated {timeAgo(doc.updatedAt)}</div>
              </div>
            </div>
            <div className="card-body">
              <DocContentView doc={doc} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
