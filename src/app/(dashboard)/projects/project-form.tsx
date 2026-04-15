"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/utils";
import { CreatableSelect } from "@/components/creatable-select";

const LS = {
  categories: "devops-tracker:project:categories",
  statuses: "devops-tracker:project:statuses",
  environments: "devops-tracker:project:environments",
  webBased: "devops-tracker:project:web-based",
} as const;

const PRESET_STATUSES = ["ACTIVE", "MAINTENANCE", "DEPRECATED", "PLANNING"];
const PRESET_CATEGORIES = ["Internal", "API", "CMS", "Data", "Commerce", "Auth", "Infra", "Other"];
const PRESET_ENVIRONMENTS = ["production", "staging", "development"];
const PRESET_WEB_BASED = ["Yes", "No"];

interface ProjectFormData {
  id?: string;
  slug?: string;
  name?: string | null;
  description?: string | null;
  url?: string | null;
  repoUrl?: string | null;
  category?: string | null;
  management?: string | null;
  status?: string;
  platform?: string[];
  environment?: string | null;
  serverIp?: string | null;
  targetGroup?: string | null;
  loadBalancer?: string | null;
  hosting?: string[];
  cdn?: string[];
  databases?: string[];
  webBasedApp?: string;
  costPerMonth?: string | null;
  notes?: string | null;
}

function normalizeCostForForm(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  return String(v).trim() || null;
}

function normalizeWebBased(v: unknown): string {
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "string" && v.trim()) return v.trim();
  return "Yes";
}

export function ProjectForm({ mode, defaultValues }: { mode: "create" | "edit"; defaultValues?: ProjectFormData }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<ProjectFormData>(() => {
    const base: ProjectFormData = {
      name: "",
      description: "",
      url: "",
      repoUrl: "",
      category: "",
      management: "",
      status: "ACTIVE",
      platform: [],
      environment: "production",
      serverIp: "",
      targetGroup: "",
      loadBalancer: "",
      hosting: [],
      cdn: [],
      databases: [],
      webBasedApp: "Yes",
      costPerMonth: null,
      notes: "",
    };
    return {
      ...base,
      ...defaultValues,
      webBasedApp: normalizeWebBased(
        defaultValues?.webBasedApp ?? (defaultValues as { isWebApp?: boolean } | undefined)?.isWebApp
      ),
      costPerMonth: normalizeCostForForm(defaultValues?.costPerMonth),
    };
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
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Terjadi kesalahan");
        return;
      }
      const data = await res.json();
      router.push(`/projects/${data.slug}`);
      router.refresh();
    } catch {
      setError("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="alert-warning" style={{ background: "var(--red-bg)", borderColor: "var(--red)", color: "var(--red-text)" }}>
          {error}
        </div>
      )}

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-header">
          <span className="card-title">Informasi Umum</span>
        </div>
        <div className="card-body">
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Site Name *</label>
              <input
                className="form-input"
                value={form.name ?? ""}
                onChange={(e) => set("name", e.target.value)}
                required
                placeholder="Portal Internal"
              />
            </div>
            <div className="form-group">
              <label className="form-label">URL</label>
              <input className="form-input" value={form.url ?? ""} onChange={(e) => set("url", e.target.value)} placeholder="https://portal.company.com" />
            </div>
            <CreatableSelect
              label="Category"
              value={form.category ?? ""}
              onChange={(v) => set("category", v)}
              presetOptions={PRESET_CATEGORIES}
              storageKey={LS.categories}
              allowEmpty
              emptyLabel="— Pilih kategori —"
            />
            <div className="form-group">
              <label className="form-label">Management / Team</label>
              <input className="form-input" value={form.management ?? ""} onChange={(e) => set("management", e.target.value)} placeholder="DevOps Team" />
            </div>
            <CreatableSelect
              label="Status"
              value={form.status ?? "ACTIVE"}
              onChange={(v) => set("status", v)}
              presetOptions={PRESET_STATUSES}
              storageKey={LS.statuses}
            />
            <div className="form-group">
              <label className="form-label">Repository URL</label>
              <input className="form-input" value={form.repoUrl ?? ""} onChange={(e) => set("repoUrl", e.target.value)} placeholder="https://github.com/company/repo" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="Deskripsi singkat tentang project ini..." />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">
                Platform / Tech Stack <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(pisah dengan koma)</span>
              </label>
              <input
                className="form-input"
                defaultValue={(form.platform ?? []).join(", ")}
                onChange={(e) => handleArrayInput("platform", e.target.value)}
                placeholder="Next.js 14, Node 20, TypeScript"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Cost / Month</label>
              <input
                className="form-input"
                type="text"
                value={form.costPerMonth ?? ""}
                onChange={(e) => set("costPerMonth", e.target.value.trim() === "" ? null : e.target.value)}
                placeholder="Mis. 45 USD, ~50/mo, gratis"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-header">
          <span className="card-title">Infrastruktur</span>
        </div>
        <div className="card-body">
          <div className="grid-2">
            <CreatableSelect
              label="Web-based Application?"
              value={form.webBasedApp ?? "Yes"}
              onChange={(v) => set("webBasedApp", v)}
              presetOptions={PRESET_WEB_BASED}
              storageKey={LS.webBased}
            />
            <CreatableSelect
              label="Environment"
              value={form.environment ?? "production"}
              onChange={(v) => set("environment", v)}
              presetOptions={PRESET_ENVIRONMENTS}
              storageKey={LS.environments}
            />
            <div className="form-group">
              <label className="form-label">Target Group</label>
              <input className="form-input mono" value={form.targetGroup ?? ""} onChange={(e) => set("targetGroup", e.target.value)} placeholder="portal-tg-prod" />
            </div>
            <div className="form-group">
              <label className="form-label">Load Balancer</label>
              <input className="form-input mono" value={form.loadBalancer ?? ""} onChange={(e) => set("loadBalancer", e.target.value)} placeholder="ALB-portal-prod" />
            </div>
            <div className="form-group">
              <label className="form-label">Server IP</label>
              <input className="form-input mono" value={form.serverIp ?? ""} onChange={(e) => set("serverIp", e.target.value)} placeholder="10.0.1.45" />
            </div>
            <div className="form-group">
              <label className="form-label">
                Hosting <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(pisah koma)</span>
              </label>
              <input className="form-input" defaultValue={(form.hosting ?? []).join(", ")} onChange={(e) => handleArrayInput("hosting", e.target.value)} placeholder="AWS EC2 t3.medium" />
            </div>
            <div className="form-group">
              <label className="form-label">
                CDN / Proxy <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(pisah koma)</span>
              </label>
              <input className="form-input" defaultValue={(form.cdn ?? []).join(", ")} onChange={(e) => handleArrayInput("cdn", e.target.value)} placeholder="Cloudflare" />
            </div>
            <div className="form-group">
              <label className="form-label">
                Database <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(pisah koma)</span>
              </label>
              <input
                className="form-input"
                defaultValue={(form.databases ?? []).join(", ")}
                onChange={(e) => handleArrayInput("databases", e.target.value)}
                placeholder="PostgreSQL 16, Redis 7"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes / Catatan Tambahan</label>
            <textarea className="form-textarea" value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} placeholder="Catatan konfigurasi..." />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button type="button" className="btn" onClick={() => router.back()}>
          Batal
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Menyimpan..." : mode === "create" ? "Buat Project" : "Simpan Perubahan"}
        </button>
      </div>
    </form>
  );
}
