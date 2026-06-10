"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/utils";
import { CreatableSelect } from "@/components/creatable-select";
import { CommaSeparatedInput } from "@/components/comma-separated-input";
import { emptyInfraRow, type InfraFormRow, orderInfraRows } from "@/lib/project-infra";
import { ProjectInfraFields } from "./project-infra-fields";
import { ProjectToolsDocsPicker } from "./project-tools-docs-picker";

const LS = {
  categories: "devops-tracker:project:categories",
  statuses: "devops-tracker:project:statuses",
  webBased: "devops-tracker:project:web-based",
} as const;

const PRESET_STATUSES = ["ACTIVE", "MAINTENANCE", "DEPRECATED", "PLANNING"];
const PRESET_CATEGORIES = ["Internal", "API", "CMS", "Data", "Commerce", "Auth", "Infra", "Other"];
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
  webBasedApp?: string;
  costPerMonth?: string | null;
  notes?: string | null;
  infras?: InfraFormRow[];
  toolIds?: string[];
  docIds?: string[];
}

function mapPrismaInfras(raw: unknown): InfraFormRow[] {
  if (!Array.isArray(raw) || raw.length === 0) return [emptyInfraRow("production")];
  return orderInfraRows(
    raw.map((r: any) => ({
      envName: String(r.envName ?? "production"),
      targetGroup: r.targetGroup ?? "",
      loadBalancer: r.loadBalancer ?? "",
      serverIp: r.serverIp ?? "",
      hosting: Array.isArray(r.hosting) ? r.hosting.map(String) : [],
      cdn: Array.isArray(r.cdn) ? r.cdn.map(String) : [],
      databases: Array.isArray(r.databases) ? r.databases.map(String) : [],
    }))
  );
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
      webBasedApp: "Yes",
      costPerMonth: null,
      notes: "",
      infras: [emptyInfraRow("production")],
      toolIds: [],
      docIds: [],
    };
    const dv = defaultValues;
    return {
      ...base,
      ...dv,
      webBasedApp: normalizeWebBased(dv?.webBasedApp ?? (dv as { isWebApp?: boolean } | undefined)?.isWebApp),
      costPerMonth: normalizeCostForForm(dv?.costPerMonth),
      infras: mapPrismaInfras(dv?.infras),
      toolIds: Array.isArray(dv?.toolIds) ? [...dv.toolIds] : [],
      docIds: Array.isArray(dv?.docIds) ? [...dv.docIds] : [],
    };
  });

  const set = (k: keyof ProjectFormData, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const infras = form.infras ?? [];
    if (infras.length === 0) {
      setError("Pilih minimal satu environment untuk infrastruktur.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const slug = mode === "create" ? slugify(form.name ?? "") : form.slug;
      const payload = {
        ...form,
        slug,
        infras,
        toolIds: form.toolIds ?? [],
        docIds: form.docIds ?? [],
      };
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
              <CommaSeparatedInput
                value={form.platform ?? []}
                onChange={(items) => set("platform", items)}
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
          <div className="grid-2" style={{ marginBottom: 8 }}>
            <CreatableSelect
              label="Web-based Application?"
              value={form.webBasedApp ?? "Yes"}
              onChange={(v) => set("webBasedApp", v)}
              presetOptions={PRESET_WEB_BASED}
              storageKey={LS.webBased}
            />
          </div>
          <ProjectInfraFields infras={form.infras ?? []} onChange={(next) => set("infras", next)} />
          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label">Notes / Catatan Tambahan</label>
            <textarea className="form-textarea" value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} placeholder="Catatan konfigurasi..." />
          </div>
        </div>
      </div>

      <ProjectToolsDocsPicker
        toolIds={form.toolIds ?? []}
        docIds={form.docIds ?? []}
        onToolIdsChange={(ids) => set("toolIds", ids)}
        onDocIdsChange={(ids) => set("docIds", ids)}
      />

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
