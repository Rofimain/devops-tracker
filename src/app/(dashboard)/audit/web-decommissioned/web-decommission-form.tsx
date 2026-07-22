"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ImagePlus, Trash2, X } from "lucide-react";
import {
  DATABASE_SCOPE_HINT,
  DELETION_BASIS_OPTIONS,
  EMPTY_WEB_DECOMMISSION_FORM,
  FINAL_STATUS_OPTIONS,
  INFRA_SCOPE_HINT,
  PROCESS_STATUS_OPTIONS,
  THIRD_PARTY_OPTIONS,
  YES_NO_OPTIONS,
  type WebDecommissionEvidenceRow,
  type WebDecommissionFormValues,
  type WebDecommissionUpsertInput,
} from "@/lib/web-decommissioned";

export type EvidenceRow = WebDecommissionEvidenceRow;
export type RecordFormValues = WebDecommissionFormValues;
export const EMPTY_FORM = EMPTY_WEB_DECOMMISSION_FORM;

function toPayload(values: RecordFormValues): WebDecommissionUpsertInput {
  return {
    requestChannel: values.requestChannel,
    platformName: values.platformName,
    domainUrl: values.domainUrl,
    ownerRequester: values.ownerRequester,
    systemOwnerTeam: values.systemOwnerTeam,
    deletionReason: values.deletionReason || null,
    deletionBasis: values.deletionBasis,
    requestDate: values.requestDate || null,
    infraApproved: values.infraApproved || null,
    infraApprovedAt: values.infraApprovedAt || null,
    infraScope: values.infraScope || null,
    databaseScope: values.databaseScope || null,
    thirdPartyIntegration: values.thirdPartyIntegration || null,
    processStatus: values.processStatus,
    picInfra: values.picInfra || null,
    processStartedAt: values.processStartedAt || null,
    estimatedDoneAt: values.estimatedDoneAt || null,
    completedAt: values.completedAt || null,
    evidenceLinks: values.evidenceLinks || null,
    technicalNotes: values.technicalNotes || null,
    finalStatus: values.finalStatus,
    auditNotes: values.auditNotes || null,
  };
}

type FieldDef =
  | { key: keyof RecordFormValues; label: string; kind: "text" | "textarea" | "date"; hint?: string; required?: boolean }
  | { key: keyof RecordFormValues; label: string; kind: "select"; options: readonly { value: string; label: string }[]; required?: boolean; allowEmpty?: boolean };

const FIELDS_BEFORE_EVIDENCE: FieldDef[] = [
  { key: "requestChannel", label: "Kanal Request Resmi (Email / Trello / WA Screenshot)", kind: "text", required: true },
  { key: "platformName", label: "Nama Web / Platform", kind: "text", required: true },
  { key: "domainUrl", label: "Domain / URL", kind: "text", required: true },
  { key: "ownerRequester", label: "Owner / Requester", kind: "text", required: true },
  { key: "systemOwnerTeam", label: "Tim Pemilik Sistem", kind: "text", required: true },
  { key: "deletionReason", label: "Alasan Penghapusan", kind: "textarea" },
  { key: "deletionBasis", label: "Dasar Penghapusan (SOP / Audit / Permintaan Bisnis)", kind: "select", options: DELETION_BASIS_OPTIONS, required: true },
  { key: "requestDate", label: "Tanggal Request", kind: "date" },
  { key: "infraApproved", label: "Approval Tim Infra (Ya/Tidak)", kind: "select", options: YES_NO_OPTIONS, allowEmpty: true },
  { key: "infraApprovedAt", label: "Tanggal Approval Infra", kind: "date" },
  { key: "infraScope", label: "Scope Infra (EC2, ALB, Target Group, DNS)", kind: "text", hint: INFRA_SCOPE_HINT },
  { key: "databaseScope", label: "Scope Infra Database (RDS / Docker / All-in-one EC2)", kind: "text", hint: DATABASE_SCOPE_HINT },
  { key: "thirdPartyIntegration", label: "Scope Integrasi Pihak Ketiga (Ya/Tidak/N/A)", kind: "select", options: THIRD_PARTY_OPTIONS, allowEmpty: true },
  { key: "processStatus", label: "Status Proses", kind: "select", options: PROCESS_STATUS_OPTIONS, required: true },
  { key: "picInfra", label: "PIC Infra", kind: "text" },
  { key: "processStartedAt", label: "Tanggal Mulai Proses", kind: "date" },
  { key: "estimatedDoneAt", label: "Estimasi Selesai", kind: "date" },
  { key: "completedAt", label: "Tanggal Selesai", kind: "date" },
  { key: "evidenceLinks", label: "Link Bukti Tambahan (opsional)", kind: "textarea", hint: "URL log / ticket / drive, satu per baris" },
];

const FIELDS_AFTER_EVIDENCE: FieldDef[] = [
  { key: "technicalNotes", label: "Catatan Teknis Infra", kind: "textarea" },
  { key: "finalStatus", label: "Status Akhir (Closed / Rejected)", kind: "select", options: FINAL_STATUS_OPTIONS, required: true },
  { key: "auditNotes", label: "Catatan Audit", kind: "textarea" },
];

function renderField(
  field: FieldDef,
  values: RecordFormValues,
  setField: (key: keyof RecordFormValues, value: string) => void,
  readOnly: boolean
) {
  return (
    <tr key={field.key}>
      <th>
        {field.label}
        {"required" in field && field.required ? <span className="wd-req">*</span> : null}
      </th>
      <td>
        {field.kind === "text" && (
          <input
            className="wd-input"
            value={String(values[field.key] ?? "")}
            onChange={(e) => setField(field.key, e.target.value)}
            disabled={readOnly}
            required={field.required}
            placeholder={field.hint}
          />
        )}
        {field.kind === "textarea" && (
          <textarea
            className="wd-input wd-textarea"
            value={String(values[field.key] ?? "")}
            onChange={(e) => setField(field.key, e.target.value)}
            disabled={readOnly}
            rows={3}
            placeholder={field.hint}
          />
        )}
        {field.kind === "date" && (
          <input
            type="date"
            className="wd-input"
            value={String(values[field.key] ?? "")}
            onChange={(e) => setField(field.key, e.target.value)}
            disabled={readOnly}
          />
        )}
        {field.kind === "select" && (
          <select
            className="wd-input"
            value={String(values[field.key] ?? "")}
            onChange={(e) => setField(field.key, e.target.value)}
            disabled={readOnly}
            required={field.required}
          >
            {field.allowEmpty && <option value="">—</option>}
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      </td>
    </tr>
  );
}

export function WebDecommissionForm({
  mode,
  recordId,
  initial,
  initialEvidences = [],
  canWrite,
}: {
  mode: "create" | "edit";
  recordId?: string;
  initial: RecordFormValues;
  initialEvidences?: EvidenceRow[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState(initial);
  const [evidences, setEvidences] = useState(initialEvidences);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [pendingPreviews, setPendingPreviews] = useState<{ file: File; url: string }[]>([]);

  const readOnly = !canWrite;

  useEffect(() => {
    const next = pendingFiles.map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPendingPreviews(next);
    return () => {
      for (const item of next) URL.revokeObjectURL(item.url);
    };
  }, [pendingFiles]);

  const setField = (key: keyof RecordFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    setSaving(true);
    setError(null);
    try {
      const payload = toPayload(values);
      const res = await fetch(
        mode === "create" ? "/api/web-decommissioned" : `/api/web-decommissioned/${recordId}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");

      const id = mode === "create" ? data.id : recordId!;

      if (pendingFiles.length > 0) {
        const fd = new FormData();
        for (const file of pendingFiles) fd.append("files", file);
        const up = await fetch(`/api/web-decommissioned/${id}/evidences`, {
          method: "POST",
          body: fd,
        });
        const upData = await up.json();
        if (!up.ok) throw new Error(upData.error || "Gagal upload bukti");
      }

      router.push(`/audit/web-decommissioned/${id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadMore() {
    if (!recordId || pendingFiles.length === 0 || readOnly) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      for (const file of pendingFiles) fd.append("files", file);
      const res = await fetch(`/api/web-decommissioned/${recordId}/evidences`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal upload");
      setEvidences((prev) => [...prev, ...(data.evidences ?? [])]);
      setPendingFiles([]);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteEvidence(evidenceId: string) {
    if (!recordId || readOnly) return;
    if (!confirm("Hapus bukti ini?")) return;
    const res = await fetch(`/api/web-decommissioned/${recordId}/evidences/${evidenceId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Gagal menghapus bukti");
      return;
    }
    setEvidences((prev) => prev.filter((e) => e.id !== evidenceId));
    router.refresh();
  }

  async function handleDeleteRecord() {
    if (!recordId || readOnly) return;
    if (!confirm("Hapus seluruh dokumentasi web decommissioned ini?")) return;
    const res = await fetch(`/api/web-decommissioned/${recordId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Gagal menghapus");
      return;
    }
    router.push("/audit/web-decommissioned");
    router.refresh();
  }

  return (
    <form className="wd-form" onSubmit={handleSave}>
      {error && <div className="wd-alert">{error}</div>}

      {readOnly && (
        <div className="wd-readonly-banner">
          Mode lihat saja — tombol simpan/hapus disembunyikan karena role akun tidak punya izin tulis.
        </div>
      )}

      <div className="wd-sheet card">
        <table className="wd-table">
          <tbody>
            {mode === "edit" && (
              <tr>
                <th>No / ID</th>
                <td>
                  <code style={{ fontSize: 11 }}>{recordId}</code>
                </td>
              </tr>
            )}
            {FIELDS_BEFORE_EVIDENCE.map((field) => renderField(field, values, setField, readOnly))}

            <tr>
              <th>
                Bukti Penghapusan (Log / Screenshot / Link)
                <div className="wd-th-hint">Bisa multiple image (JPG, PNG, WEBP, GIF — max 10 MB / file)</div>
              </th>
              <td>
                <div className="wd-evidence-grid">
                  {evidences.map((ev) => (
                    <div key={ev.id} className="wd-evidence-item">
                      <button
                        type="button"
                        className="wd-evidence-thumb-btn"
                        onClick={() =>
                          setLightbox(`/api/web-decommissioned/${recordId}/evidences/${ev.id}`)
                        }
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/web-decommissioned/${recordId}/evidences/${ev.id}`}
                          alt={ev.imageName}
                          className="wd-evidence-thumb"
                        />
                      </button>
                      <div className="wd-evidence-meta">
                        <span title={ev.imageName}>{ev.imageName}</span>
                        {canWrite && (
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => handleDeleteEvidence(ev.id)}
                            title="Hapus"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {pendingPreviews.map(({ file, url }, i) => (
                    <div key={`${file.name}-${i}`} className="wd-evidence-item wd-evidence-pending">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={file.name} className="wd-evidence-thumb" />
                      <div className="wd-evidence-meta">
                        <span title={file.name}>{file.name}</span>
                        {canWrite && (
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() =>
                              setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))
                            }
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {canWrite && (
                  <div className="wd-evidence-actions">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      multiple
                      hidden
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        if (files.length) setPendingFiles((prev) => [...prev, ...files]);
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => fileRef.current?.click()}
                    >
                      <ImagePlus size={13} /> Tambah gambar
                    </button>
                    {mode === "edit" && pendingFiles.length > 0 && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={uploading}
                        onClick={handleUploadMore}
                      >
                        {uploading ? "Uploading…" : `Upload ${pendingFiles.length} gambar`}
                      </button>
                    )}
                    {mode === "create" && pendingFiles.length > 0 && (
                      <span className="wd-th-hint">{pendingFiles.length} gambar akan diupload saat simpan</span>
                    )}
                  </div>
                )}

                {evidences.length === 0 && pendingFiles.length === 0 && (
                  <div className="wd-empty-evidence">Belum ada bukti screenshot.</div>
                )}
              </td>
            </tr>

            {FIELDS_AFTER_EVIDENCE.map((field) => renderField(field, values, setField, readOnly))}
          </tbody>
        </table>
      </div>

      <div className="wd-form-actions">
        <Link href="/audit/web-decommissioned" className="btn">
          Kembali
        </Link>
        {mode === "edit" && canWrite && (
          <button type="button" className="btn btn-danger" onClick={handleDeleteRecord}>
            Hapus record
          </button>
        )}
        {canWrite && (
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Menyimpan…" : mode === "create" ? "Simpan dokumentasi" : "Simpan perubahan"}
          </button>
        )}
      </div>

      {lightbox && (
        <div className="wd-lightbox" onClick={() => setLightbox(null)} role="presentation">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Bukti" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </form>
  );
}
