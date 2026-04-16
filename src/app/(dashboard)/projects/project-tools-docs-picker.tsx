"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TOOL_CATEGORY_COLORS } from "@/lib/utils";

type ToolRow = { id: string; name: string; category: string; version?: string | null };
type DocRow = { id: string; title: string; category?: string | null; project?: { name: string; slug: string } | null };

export function ProjectToolsDocsPicker({
  toolIds,
  docIds,
  onToolIdsChange,
  onDocIdsChange,
}: {
  toolIds: string[];
  docIds: string[];
  onToolIdsChange: (ids: string[]) => void;
  onDocIdsChange: (ids: string[]) => void;
}) {
  const [tools, setTools] = useState<ToolRow[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loadErr, setLoadErr] = useState("");
  const [qTool, setQTool] = useState("");
  const [qDoc, setQDoc] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tr, dr] = await Promise.all([
          fetch("/api/tools").then((r) => (r.ok ? r.json() : Promise.reject(new Error("tools")))),
          fetch("/api/docs").then((r) => (r.ok ? r.json() : Promise.reject(new Error("docs")))),
        ]);
        if (!cancelled) {
          setTools(Array.isArray(tr) ? tr : []);
          setDocs(Array.isArray(dr) ? dr : []);
        }
      } catch {
        if (!cancelled) setLoadErr("Gagal memuat katalog tool/dokumen. Coba refresh.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredTools = useMemo(() => {
    const q = qTool.trim().toLowerCase();
    if (!q) return tools;
    return tools.filter((t) => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
  }, [tools, qTool]);

  const filteredDocs = useMemo(() => {
    const q = qDoc.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((d) => d.title.toLowerCase().includes(q) || (d.category ?? "").toLowerCase().includes(q));
  }, [docs, qDoc]);

  const toggleTool = (id: string) => {
    onToolIdsChange(toolIds.includes(id) ? toolIds.filter((x) => x !== id) : [...toolIds, id]);
  };

  const toggleDoc = (id: string) => {
    onDocIdsChange(docIds.includes(id) ? docIds.filter((x) => x !== id) : [...docIds, id]);
  };

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="card-header">
        <span className="card-title">Tools & dokumentasi</span>
      </div>
      <div className="card-body">
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
          Centang tool dari <Link href="/tools" style={{ color: "var(--accent)" }}>katalog</Link> dan dokumen dari{" "}
          <Link href="/docs" style={{ color: "var(--accent)" }}>dokumentasi</Link> yang dipakai project ini. Relasi tampil di halaman katalog masing-masing.
        </p>
        {loadErr ? <div className="alert-warning" style={{ fontSize: 12, marginBottom: 10 }}>{loadErr}</div> : null}

        <div className="grid-2" style={{ alignItems: "stretch" }}>
          <div>
            <label className="form-label">Tools katalog</label>
            <input className="form-input" style={{ marginBottom: 8 }} value={qTool} onChange={(e) => setQTool(e.target.value)} placeholder="Cari nama / kategori…" />
            <div
              style={{
                maxHeight: 240,
                overflowY: "auto",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: 8,
                background: "var(--bg-subtle)",
              }}
            >
              {filteredTools.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Belum ada tool.</div>
              ) : (
                filteredTools.map((t) => (
                  <label
                    key={t.id}
                    style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 4px", cursor: "pointer", fontSize: 12 }}
                  >
                    <input type="checkbox" checked={toolIds.includes(t.id)} onChange={() => toggleTool(t.id)} style={{ marginTop: 2 }} />
                    <span style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600 }}>{t.name}</span>{" "}
                      <span className={`badge ${TOOL_CATEGORY_COLORS[t.category] ?? "badge-gray"}`} style={{ fontSize: 9 }}>
                        {t.category}
                      </span>
                      {t.version ? <span className="mono" style={{ color: "var(--text-muted)", marginLeft: 4 }}>v{t.version}</span> : null}
                    </span>
                  </label>
                ))
              )}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>{toolIds.length} tool dipilih</div>
          </div>

          <div>
            <label className="form-label">Dokumentasi</label>
            <input className="form-input" style={{ marginBottom: 8 }} value={qDoc} onChange={(e) => setQDoc(e.target.value)} placeholder="Cari judul / kategori…" />
            <div
              style={{
                maxHeight: 240,
                overflowY: "auto",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: 8,
                background: "var(--bg-subtle)",
              }}
            >
              {filteredDocs.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Belum ada dokumen.</div>
              ) : (
                filteredDocs.map((d) => (
                  <label
                    key={d.id}
                    style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 4px", cursor: "pointer", fontSize: 12 }}
                  >
                    <input type="checkbox" checked={docIds.includes(d.id)} onChange={() => toggleDoc(d.id)} style={{ marginTop: 2 }} />
                    <span style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600 }}>{d.title}</span>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                        {d.project ? (
                          <>
                            Project:{" "}
                            <Link href={`/projects/${d.project.slug}`} onClick={(e) => e.stopPropagation()} style={{ color: "var(--accent)" }}>
                              {d.project.name}
                            </Link>
                          </>
                        ) : (
                          "Tanpa project"
                        )}
                      </div>
                    </span>
                  </label>
                ))
              )}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>{docIds.length} dokumen dipilih</div>
          </div>
        </div>
      </div>
    </div>
  );
}
