"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DocContentType } from "@prisma/client";
import { formatFileSize } from "@/lib/doc-mime";

const CATEGORIES = ["Runbook", "Config", "Architecture", "Onboarding", "API", "Database", "Security", "Other"];

type DocFormValues = {
  id?: string;
  title?: string;
  content?: string;
  category?: string;
  tags?: string;
  projectId?: string;
  contentType?: DocContentType;
  fileName?: string | null;
  fileSize?: number | null;
};

export function DocForm({
  mode,
  defaultValues,
  projects,
  defaultProjectId,
}: {
  mode: "create" | "edit";
  defaultValues?: DocFormValues;
  projects: { id: string; name: string }[];
  defaultProjectId?: string;
}) {
  const router = useRouter();
  const initialContentType = defaultValues?.contentType ?? DocContentType.TEXT;
  const isExistingFileDoc = initialContentType !== DocContentType.TEXT;

  const [source, setSource] = useState<"text" | "upload">(isExistingFileDoc ? "upload" : "text");
  const [form, setForm] = useState({
    title: "",
    content: "",
    category: "",
    tags: "",
    projectId: defaultProjectId ?? "",
    contentType: initialContentType,
    fileName: null as string | null,
    fileSize: null as number | null,
    ...defaultValues,
  });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const tags = form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const projectId = form.projectId || null;

      if (mode === "create" && source === "upload") {
        if (!file) {
          setError("Pilih file PDF atau DOCX.");
          return;
        }
        const fd = new FormData();
        fd.append("file", file);
        fd.append("title", form.title);
        fd.append("category", form.category);
        fd.append("tags", form.tags);
        if (projectId) fd.append("projectId", projectId);

        const res = await fetch("/api/docs/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const d = await res.json();
          setError(d.error ?? "Upload gagal");
          return;
        }
        const data = await res.json();
        router.push(`/docs/${data.id}`);
        router.refresh();
        return;
      }

      if (mode === "edit" && isExistingFileDoc) {
        const metaRes = await fetch(`/api/docs/${defaultValues?.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title,
            content: form.content,
            category: form.category || null,
            tags,
            projectId,
          }),
        });
        if (!metaRes.ok) {
          const d = await metaRes.json();
          setError(d.error ?? "Gagal menyimpan metadata");
          return;
        }

        if (file) {
          const fd = new FormData();
          fd.append("file", file);
          const fileRes = await fetch(`/api/docs/${defaultValues?.id}/file`, { method: "PUT", body: fd });
          if (!fileRes.ok) {
            const d = await fileRes.json();
            setError(d.error ?? "Gagal mengganti file");
            return;
          }
        }

        router.push(`/docs/${defaultValues?.id}`);
        router.refresh();
        return;
      }

      const payload = {
        title: form.title,
        content: form.content,
        category: form.category || null,
        tags,
        projectId,
      };
      const res = await fetch(mode === "create" ? "/api/docs" : `/api/docs/${defaultValues?.id}`, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Error");
        return;
      }
      const data = await res.json();
      router.push(`/docs/${data.id}`);
      router.refresh();
    } catch {
      setError("Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  const showUploadField = (mode === "create" && source === "upload") || (mode === "edit" && isExistingFileDoc);
  const showTextarea = !showUploadField && !(mode === "edit" && isExistingFileDoc);

  return (
    <form onSubmit={handleSubmit}>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-header">
          <span className="card-title">{mode === "create" ? "Dokumen Baru" : "Edit Dokumen"}</span>
        </div>
        <div className="card-body">
          {error && (
            <div style={{ background: "var(--red-bg)", color: "var(--red-text)", borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 12 }}>
              {error}
            </div>
          )}

          {mode === "create" && (
            <div className="tabs" style={{ marginBottom: 16 }}>
              <button type="button" className={`tab-btn ${source === "text" ? "active" : ""}`} onClick={() => setSource("text")}>
                Tulis manual
              </button>
              <button type="button" className={`tab-btn ${source === "upload" ? "active" : ""}`} onClick={() => setSource("upload")}>
                Upload PDF / Word
              </button>
            </div>
          )}

          <div className="grid-2">
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Title *</label>
              <input
                className="form-input"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                required
                placeholder="Runbook — Deploy & Rollback Procedure"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category} onChange={(e) => set("category", e.target.value)}>
                <option value="">— Pilih —</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Project (opsional)</label>
              <select className="form-select" value={form.projectId} onChange={(e) => set("projectId", e.target.value)}>
                <option value="">— General / tidak terikat project —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">
                Tags <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(pisah koma)</span>
              </label>
              <input
                className="form-input"
                value={form.tags}
                onChange={(e) => set("tags", e.target.value)}
                placeholder="CI/CD, Deploy, GitHub Actions"
              />
            </div>
          </div>

          {showUploadField && (
            <div className="form-group">
              <label className="form-label">File (PDF / DOCX) *</label>
              <input
                className="form-input"
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required={mode === "create"}
              />
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                Maksimal 20 MB. DOCX akan di-preview sebagai HTML; PDF ditampilkan langsung di browser.
              </div>
              {mode === "edit" && form.fileName && !file && (
                <div style={{ fontSize: 12, marginTop: 8, color: "var(--text-secondary)" }}>
                  File saat ini: <strong>{form.fileName}</strong>
                  {form.fileSize ? ` (${formatFileSize(form.fileSize)})` : ""}
                </div>
              )}
            </div>
          )}

          {showTextarea && (
            <div className="form-group">
              <label className="form-label">Content</label>
              <textarea
                className="form-textarea"
                style={{ minHeight: 320, fontFamily: "var(--font-mono, monospace)", fontSize: 12 }}
                value={form.content}
                onChange={(e) => set("content", e.target.value)}
                required={mode === "create" && source === "text"}
                placeholder={"# Judul\n\n## Overview\n\nTulis dokumentasi kamu di sini..."}
              />
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button type="button" className="btn" onClick={() => router.back()}>
          Batal
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Menyimpan..." : mode === "create" ? "Simpan Dokumen" : "Update Dokumen"}
        </button>
      </div>
    </form>
  );
}
