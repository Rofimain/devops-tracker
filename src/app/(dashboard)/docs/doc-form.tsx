"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = ["Runbook", "Config", "Architecture", "Onboarding", "API", "Database", "Security", "Other"];

export function DocForm({ mode, defaultValues, projects, defaultProjectId }: { mode: "create" | "edit"; defaultValues?: any; projects: { id: string; name: string }[]; defaultProjectId?: string; }) {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", content: "", category: "", tags: "", projectId: defaultProjectId ?? "", ...defaultValues });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, tags: form.tags.split(",").map((t: string) => t.trim()).filter(Boolean), projectId: form.projectId || null };
      const res = await fetch(mode === "create" ? "/api/docs" : `/api/docs/${defaultValues?.id}`, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Error"); return; }
      const data = await res.json();
      router.push(`/docs/${data.id}`);
      router.refresh();
    } catch { setError("Terjadi kesalahan."); } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-header"><span className="card-title">{mode === "create" ? "Dokumen Baru" : "Edit Dokumen"}</span></div>
        <div className="card-body">
          {error && <div style={{ background: "var(--red-bg)", color: "var(--red-text)", borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 12 }}>{error}</div>}
          <div className="grid-2">
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Title *</label>
              <input className="form-input" value={form.title} onChange={(e) => set("title", e.target.value)} required placeholder="Runbook — Deploy & Rollback Procedure" />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category} onChange={(e) => set("category", e.target.value)}>
                <option value="">— Pilih —</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Project (opsional)</label>
              <select className="form-select" value={form.projectId} onChange={(e) => set("projectId", e.target.value)}>
                <option value="">— General / tidak terikat project —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Tags <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(pisah koma)</span></label>
              <input className="form-input" value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="CI/CD, Deploy, GitHub Actions" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Content (Markdown supported)</label>
            <textarea className="form-textarea" style={{ minHeight: 320, fontFamily: "var(--font-mono, monospace)", fontSize: 12 }} value={form.content} onChange={(e) => set("content", e.target.value)} placeholder={"# Judul\n\n## Overview\n\nTulis dokumentasi kamu di sini...\n\n```bash\n# contoh kode\ndocker compose up -d\n```"} required />
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button type="button" className="btn" onClick={() => router.back()}>Batal</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Menyimpan..." : mode === "create" ? "Simpan Dokumen" : "Update Dokumen"}</button>
      </div>
    </form>
  );
}
