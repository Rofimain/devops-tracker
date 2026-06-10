import { DocContentType } from "@prisma/client";
import { formatFileSize } from "@/lib/doc-mime";
import Link from "next/link";

type DocForView = {
  id: string;
  title: string;
  content: string;
  contentType: DocContentType;
  fileName: string | null;
  fileSize: number | null;
};

export function DocContentView({ doc }: { doc: DocForView }) {
  const fileUrl = `/api/docs/${doc.id}/file`;

  if (doc.contentType === DocContentType.PDF) {
    return (
      <div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 12, fontSize: 12, color: "var(--text-muted)" }}>
          <span>
            {doc.fileName ?? "document.pdf"}
            {doc.fileSize ? ` · ${formatFileSize(doc.fileSize)}` : ""}
          </span>
          <Link href={fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
            Buka / download
          </Link>
        </div>
        <iframe
          src={fileUrl}
          title={doc.title}
          style={{ width: "100%", height: "75vh", border: "1px solid var(--border)", borderRadius: 8, background: "#fff" }}
        />
      </div>
    );
  }

  if (doc.contentType === DocContentType.DOCX) {
    return (
      <div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 12, fontSize: 12, color: "var(--text-muted)" }}>
          <span>
            {doc.fileName ?? "document.docx"}
            {doc.fileSize ? ` · ${formatFileSize(doc.fileSize)}` : ""}
          </span>
          <Link href={fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
            Download asli (.docx)
          </Link>
        </div>
        {doc.content ? (
          <div className="doc-html-preview" dangerouslySetInnerHTML={{ __html: doc.content }} />
        ) : (
          <div className="alert-info" style={{ fontSize: 12 }}>
            Preview tidak tersedia.{" "}
            <Link href={fileUrl} style={{ color: "var(--accent)" }}>
              Download file Word
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <pre
      style={{
        whiteSpace: "pre-wrap",
        fontFamily: "var(--font-mono, monospace)",
        fontSize: 12,
        color: "var(--text-primary)",
        lineHeight: 1.7,
        margin: 0,
      }}
    >
      {doc.content}
    </pre>
  );
}
