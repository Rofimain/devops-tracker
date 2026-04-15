"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddToolForm({ projectId, projectSlug, tools }: { projectId: string; projectSlug: string; tools: any[] }) {
  const router = useRouter();
  const [toolId, setToolId] = useState("");
  const [version, setVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolId) { setError("Pilih tool terlebih dahulu."); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/tools`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolId, version, notes }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Error"); return; }
      router.push(`/projects/${projectSlug}?tab=tools`);
      router.refresh();
    } catch { setError("Terjadi kesalahan."); } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="card">
        <div className="card-header"><span className="card-title">Tambah Tool ke Project</span></div>
        <div className="card-body">
          {error && <div className="alert-warning" style={{ background: "var(--red-bg)", color: "var(--red-text)", borderColor: "var(--red)" }}>{error}</div>}
          <div className="form-group">
            <label className="form-label">Tool *</label>
            <select className="form-select" value={toolId} onChange={(e) => setToolId(e.target.value)} required>
              <option value="">— Pilih tool —</option>
              {tools.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.category})</option>)}
            </select>
            {tools.length === 0 && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Semua tool sudah ditambahkan. <a href="/tools" style={{ color: "var(--accent)" }}>Tambah tool baru ke katalog →</a></div>}
          </div>
          <div className="form-group">
            <label className="form-label">Version (opsional)</label>
            <input className="form-input mono" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="2.48.0" />
          </div>
          <div className="form-group">
            <label className="form-label">Config Notes</label>
            <textarea className="form-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan konfigurasi spesifik untuk project ini..." />
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
        <button type="button" className="btn" onClick={() => router.back()}>Batal</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Menyimpan..." : "Tambah Tool"}</button>
      </div>
    </form>
  );
}
