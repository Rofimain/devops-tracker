"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/utils";

const STATUSES = ["ACTIVE", "MAINTENANCE", "DEPRECATED", "PLANNING"];
const CATEGORIES = ["Internal", "API", "CMS", "Data", "Commerce", "Auth", "Infra", "Other"];

interface ProjectFormData {
  id?: string;
  slug?: string;
  name?: string;
  description?: string;
  url?: string;
  repoUrl?: string;
  category?: string;
  management?: string;
  status?: string;
  platform?: string[];
  environment?: string;
  serverIp?: string;
  targetGroup?: string;
  loadBalancer?: string;
  hosting?: string[];
  cdn?: string[];
  databases?: string[];
  isWebApp?: boolean;
  costPerMonth?: number | null;
  notes?: string;
}

export function ProjectForm({ mode, defaultValues }: { mode: "create" | "edit"; defaultValues?: ProjectFormData }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<ProjectFormData>({
    name: "", description: "", url: "", repoUrl: "", category: "", management: "",
    status: "ACTIVE", platform: [], environment: "production", serverIp: "",
    targetGroup: "", loadBalancer: "", hosting: [], cdn: [], databases: [],
    isWebApp: true, costPerMonth: null, notes: "",
    ...defaultValues,
  });

  const set = (k: keyof ProjectFormData, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleArrayInput = (key: keyof ProjectFormData, value: string) => {
    set(key, value.split(",").map((s) => s.trim()).filter(Boolean));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const slug = mode === "create" ? slugify(form.name ?? "") : form.slug;
      const payload = { ...form, slug };
      const res = await fetch(mode === "create" ? "/api/projects" : `/api/projects/${form.id}`, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Terjadi kesalahan"); return; }
      const data = await res.json();
      router.push(`/projects/${data.slug}`);
      router.refresh();
    } catch { setError("Terjadi kesalahan"); } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert-warning" style={{ background: "var(--red-bg)", borderColor: "var(--red)", color: "var(--red-text)" }}>{error}</div>}

      {/* General Info */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-header"><span className="card-title">Informasi Umum</span></div>
        <div className="card-body">
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Site Name *</label>
              <input className="form-input" value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="Portal Internal" />
            </div>
            <div className="form-group">
              <label className="form-label">URL</label>
              <input className="form-input" value={form.url} onChange={(e) => set("url", e.target.value)} placeholder="https://portal.company.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category} onChange={(e) => set("category", e.target.value)}>
                <option value="">— Pilih kategori —</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Management / Team</label>
              <input className="form-input" value={form.management} onChange={(e) => set("management", e.target.value)} placeholder="DevOps Team" />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={(e) => set("status", e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Repository URL</label>
              <input className="form-input" value={form.repoUrl} onChange={(e) => set("repoUrl", e.target.value)} placeholder="https://github.com/company/repo" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Deskripsi singkat tentang project ini..." />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Platform / Tech Stack <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(pisah dengan koma)</span></label>
              <input className="form-input" defaultValue={(form.platform ?? []).join(", ")} onChange={(e) => handleArrayInput("platform", e.target.value)} placeholder="Next.js 14, Node 20, TypeScript" />
            </div>
            <div className="form-group">
              <label className="form-label">Cost / Month (USD)</label>
              <input className="form-input" type="number" step="0.01" value={form.costPerMonth ?? ""} onChange={(e) => set("costPerMonth", e.target.value ? parseFloat(e.target.value) : null)} placeholder="45.00" />
            </div>
          </div>
        </div>
      </div>

      {/* Infrastructure */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-header"><span className="card-title">Infrastruktur</span></div>
        <div className="card-body">
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Web-based Application?</label>
              <select className="form-select" value={form.isWebApp ? "yes" : "no"} onChange={(e) => set("isWebApp", e.target.value === "yes")}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Environment</label>
              <select className="form-select" value={form.environment} onChange={(e) => set("environment", e.target.value)}>
                {["production", "staging", "development"].map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Target Group</label>
              <input className="form-input mono" value={form.targetGroup} onChange={(e) => set("targetGroup", e.target.value)} placeholder="portal-tg-prod" />
            </div>
            <div className="form-group">
              <label className="form-label">Load Balancer</label>
              <input className="form-input mono" value={form.loadBalancer} onChange={(e) => set("loadBalancer", e.target.value)} placeholder="ALB-portal-prod" />
            </div>
            <div className="form-group">
              <label className="form-label">Server IP</label>
              <input className="form-input mono" value={form.serverIp} onChange={(e) => set("serverIp", e.target.value)} placeholder="10.0.1.45" />
            </div>
            <div className="form-group">
              <label className="form-label">Hosting <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(pisah koma)</span></label>
              <input className="form-input" defaultValue={(form.hosting ?? []).join(", ")} onChange={(e) => handleArrayInput("hosting", e.target.value)} placeholder="AWS EC2 t3.medium, GCP" />
            </div>
            <div className="form-group">
              <label className="form-label">CDN / Proxy <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(pisah koma)</span></label>
              <input className="form-input" defaultValue={(form.cdn ?? []).join(", ")} onChange={(e) => handleArrayInput("cdn", e.target.value)} placeholder="Cloudflare, AWS CloudFront" />
            </div>
            <div className="form-group">
              <label className="form-label">Database <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(pisah koma)</span></label>
              <input className="form-input" defaultValue={(form.databases ?? []).join(", ")} onChange={(e) => handleArrayInput("databases", e.target.value)} placeholder="PostgreSQL 16, Redis 7" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes / Catatan Tambahan</label>
            <textarea className="form-textarea" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Catatan konfigurasi, kredensial path, dll..." />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button type="button" className="btn" onClick={() => router.back()}>Batal</button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Menyimpan..." : mode === "create" ? "Buat Project" : "Simpan Perubahan"}
        </button>
      </div>
    </form>
  );
}
