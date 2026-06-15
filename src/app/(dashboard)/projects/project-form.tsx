"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { slugify, statusBadgeClass, statusLabel } from "@/lib/utils";
import { CreatableSelect } from "@/components/creatable-select";
import { CommaSeparatedInput } from "@/components/comma-separated-input";
import { emptyInfraRow, type InfraFormRow, orderInfraRows } from "@/lib/project-infra";
import { normalizeExternalUrl } from "@/lib/external-url";
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

function mapPrismaInfras(raw: unknown, projectUrl?: string | null): InfraFormRow[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    const row = emptyInfraRow("production");
    if (projectUrl) row.url = projectUrl;
    return [row];
  }
  return orderInfraRows(
    raw.map((r: any) => {
      const envName = String(r.envName ?? "production");
      let url = r.url != null ? String(r.url) : "";
      if (!url && envName.toLowerCase() === "production" && projectUrl) {
        url = projectUrl;
      }
      return {
        envName,
        targetGroup: r.targetGroup ?? "",
        loadBalancer: r.loadBalancer ?? "",
        serverIp: r.serverIp ?? "",
        url,
        hosting: Array.isArray(r.hosting) ? r.hosting.map(String) : [],
        cdn: Array.isArray(r.cdn) ? r.cdn.map(String) : [],
        databases: Array.isArray(r.databases) ? r.databases.map(String) : [],
      };
    })
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
      infras: mapPrismaInfras(dv?.infras, dv?.url),
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
      const infrasPrepared = infras.map((row) => {
        const isProd = row.envName.toLowerCase() === "production";
        const url = isProd
          ? normalizeExternalUrl(row.url || form.url || "") ?? ""
          : normalizeExternalUrl(row.url) ?? "";
        return { ...row, url };
      });
      const productionUrl =
        normalizeExternalUrl(infrasPrepared.find((r) => r.envName.toLowerCase() === "production")?.url || form.url) ??
        normalizeExternalUrl(form.url);

      const payload = {
        ...form,
        slug,
        url: productionUrl,
        repoUrl: normalizeExternalUrl(form.repoUrl),
        infras: infrasPrepared,
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
        <div className="alert-warning" style={{ background: "var(--red-bg)", borderColor: "var(--red)", color: "var(--red-text)", marginBottom: 14 }}>
          {error}
        </div>
      )}

      <div className="detail-header project-form-header">
        <div className="project-avatar">
          {(form.name ?? "NP")
            .split(" ")
            .map((w) => w[0])
            .slice(0, 2)
            .join("")
            .toUpperCase() || "NP"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="project-detail-title-row">
            <input
              className="project-form-title-input"
              value={form.name ?? ""}
              onChange={(e) => set("name", e.target.value)}
              required
              placeholder="Nama project"
            />
            <span className={`badge ${statusBadgeClass(form.status ?? "ACTIVE")}`}>
              {statusLabel(form.status ?? "ACTIVE")}
            </span>
          </div>
          <textarea
            className="project-form-desc-input"
            value={form.description ?? ""}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Deskripsi singkat tentang project ini..."
            rows={2}
          />
          {form.category ? (
            <div className="project-meta-row" style={{ marginTop: 10 }}>
              <span className="badge badge-blue">{form.category}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="project-overview-grid">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Informasi Umum</span>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">URL (Production)</label>
              <input
                className="form-input"
                value={form.url ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => ({
                    ...f,
                    url: v,
                    infras: (f.infras ?? []).map((row) =>
                      row.envName.toLowerCase() === "production" ? { ...row, url: v } : row
                    ),
                  }));
                }}
                placeholder="https://portal.company.com"
              />
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                URL staging/dev atur per environment di Infrastruktur.
              </div>
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
            <CreatableSelect
              label="Status"
              value={form.status ?? "ACTIVE"}
              onChange={(v) => set("status", v)}
              presetOptions={PRESET_STATUSES}
              storageKey={LS.statuses}
            />
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Management / Team</label>
              <input
                className="form-input"
                value={form.management ?? ""}
                onChange={(e) => set("management", e.target.value)}
                placeholder="DevOps Team"
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Repository URL</label>
              <input
                className="form-input"
                value={form.repoUrl ?? ""}
                onChange={(e) => set("repoUrl", e.target.value)}
                placeholder="https://github.com/company/repo"
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                Platform / Tech Stack <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(pisah koma)</span>
              </label>
              <CommaSeparatedInput
                value={form.platform ?? []}
                onChange={(items) => set("platform", items)}
                placeholder="Next.js 14, Node 20, TypeScript"
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Cost / Month</label>
              <input
                className="form-input"
                type="text"
                value={form.costPerMonth ?? ""}
                onChange={(e) => set("costPerMonth", e.target.value.trim() === "" ? null : e.target.value)}
                placeholder="Otomatis dari tab Cost / Month (opsional override)"
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Notes / Catatan Tambahan</label>
              <textarea
                className="form-textarea"
                rows={3}
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Catatan konfigurasi..."
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Infrastruktur</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Web App</span>
              <select
                className="form-select"
                style={{ width: "auto", minWidth: 72, padding: "3px 8px", fontSize: 11 }}
                value={form.webBasedApp ?? "Yes"}
                onChange={(e) => set("webBasedApp", e.target.value)}
              >
                {PRESET_WEB_BASED.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <ProjectInfraFields
              infras={form.infras ?? []}
              onChange={(next) => {
                const production = next.find((r) => r.envName.toLowerCase() === "production");
                setForm((f) => ({
                  ...f,
                  infras: next,
                  url: production?.url ?? f.url,
                }));
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <ProjectToolsDocsPicker
          toolIds={form.toolIds ?? []}
          docIds={form.docIds ?? []}
          onToolIdsChange={(ids) => set("toolIds", ids)}
          onDocIdsChange={(ids) => set("docIds", ids)}
        />
      </div>

      <div className="project-form-actions">
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
