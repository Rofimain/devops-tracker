"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = ["CI/CD", "Container", "Monitoring", "Database", "Web Server", "CDN/DNS", "SSL", "Logging", "Security", "Other"];

export function NewToolForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", category: "", version: "", description: "", docsUrl: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/tools", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Error"); return; }
      router.push("/tools");
      router.refresh();
    } catch { setError("Terjadi kesalahan."); } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="card">
        <div className="card-header"><span className="card-title">Tool Baru</span></div>
        <div className="card-body">
          {error && <div style={{ background: "var(--red-bg)", color: "var(--red-text)", borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 12 }}>{error}</div>}
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Tool Name *</label>
              <input className="form-input" value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="Docker" />
            </div>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select className="form-select" value={form.category} onChange={(e) => set("category", e.target.value)} required>
                <option value="">— Pilih —</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Version</label>
              <input className="form-input mono" value={form.version} onChange={(e) => set("version", e.target.value)} placeholder="25.0.3" />
            </div>
            <div className="form-group">
              <label className="form-label">Docs URL</label>
              <input className="form-input" value={form.docsUrl} onChange={(e) => set("docsUrl", e.target.value)} placeholder="https://docs.docker.com" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Deskripsi singkat tentang tool ini..." />
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
