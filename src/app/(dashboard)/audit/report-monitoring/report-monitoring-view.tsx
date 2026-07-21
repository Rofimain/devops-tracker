"use client";

import { Fragment, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ImageIcon, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  isMonthApplicable,
  monthFullLabel,
  monthShortLabel,
  monthsForPeriod,
  PERIOD_OPTIONS,
  type MonitoringCheckPeriod,
} from "@/lib/report-monitoring";

export type ReportCheckRow = {
  id: string;
  month: number;
  checkedAt: string | null;
  checkedAtDisplay: string;
  noteText: string | null;
  hasImage: boolean;
  imageName: string | null;
};

export type ReportServiceRow = {
  id: string;
  name: string;
  period: MonitoringCheckPeriod;
  periodLabel: string;
  checksByMonth: Record<number, ReportCheckRow>;
};

type Props = {
  year: number;
  months: number[];
  services: ReportServiceRow[];
  canWrite: boolean;
  prevHref: string;
  nextHref: string;
  thisYearHref: string;
};

type EditTarget = {
  serviceId: string;
  serviceName: string;
  period: MonitoringCheckPeriod;
  month: number;
  check?: ReportCheckRow;
};

export function ReportMonitoringView({
  year,
  months,
  services,
  canWrite,
  prevHref,
  nextHref,
  thisYearHref,
}: Props) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editService, setEditService] = useState<ReportServiceRow | null>(null);

  const filledCount = useMemo(() => {
    let required = 0;
    let filled = 0;
    for (const s of services) {
      for (const m of monthsForPeriod(s.period)) {
        required += 1;
        const c = s.checksByMonth[m];
        if (c?.checkedAt || c?.noteText || c?.hasImage) filled += 1;
      }
    }
    return { required, filled };
  }, [services]);

  return (
    <div className="rm-page">
      <div className="rm-toolbar">
        <div className="rm-toolbar-left">
          <div className="rm-year-nav">
            <Link href={prevHref} className="btn btn-sm" title="Tahun sebelumnya">
              <ChevronLeft size={14} />
            </Link>
            <span className="rm-year-label">{year}</span>
            <Link href={nextHref} className="btn btn-sm" title="Tahun berikutnya">
              <ChevronRight size={14} />
            </Link>
            <Link href={thisYearHref} className="btn btn-sm">
              Tahun ini
            </Link>
          </div>
          <div className="rm-meta">
            {services.length} service · {filledCount.filled}/{filledCount.required} slot terisi
            {!canWrite ? " · view only" : null}
          </div>
        </div>
        {canWrite ? (
          <button type="button" className="btn btn-primary" onClick={() => setAddOpen(true)}>
            <Plus size={13} /> Tambah Service
          </button>
        ) : null}
      </div>

      {services.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: "48px 0" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
            <div>Belum ada service untuk Report Monitoring.</div>
            {canWrite ? (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setAddOpen(true)}>
                Tambah Service Pertama
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="card rm-table-card">
          <div className="table-wrap rm-table-wrap">
            <table className="data-table rm-table">
              <thead>
                <tr>
                  <th rowSpan={2} className="rm-sticky rm-col-no">
                    No
                  </th>
                  <th rowSpan={2} className="rm-sticky rm-col-service">
                    Service
                  </th>
                  <th rowSpan={2} className="rm-col-period">
                    Period
                  </th>
                  {months.map((m) => (
                    <th key={m} colSpan={2} className="rm-month-head">
                      {monthShortLabel(m)} {year}
                    </th>
                  ))}
                  {canWrite ? (
                    <th rowSpan={2} className="rm-col-actions">
                      Aksi
                    </th>
                  ) : null}
                </tr>
                <tr>
                  {months.map((m) => (
                    <Fragment key={m}>
                      <th className="rm-subhead">Date</th>
                      <th className="rm-subhead">Note</th>
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {services.map((service, idx) => (
                  <tr key={service.id}>
                    <td className="rm-sticky rm-col-no mono">{idx + 1}</td>
                    <td className="rm-sticky rm-col-service">
                      <span className="rm-service-name">{service.name}</span>
                    </td>
                    <td className="rm-col-period">
                      <span className="badge badge-blue">{service.periodLabel}</span>
                    </td>
                    {months.map((month) => {
                      const applicable = isMonthApplicable(service.period, month);
                      const check = service.checksByMonth[month];
                      if (!applicable) {
                        return (
                          <Fragment key={`${service.id}-${month}`}>
                            <td className="rm-cell-na">—</td>
                            <td className="rm-cell-na">—</td>
                          </Fragment>
                        );
                      }
                      const empty = !check?.checkedAt && !check?.noteText && !check?.hasImage;
                      return (
                        <Fragment key={`${service.id}-${month}`}>
                          <td
                            className={`rm-cell-date ${empty ? "rm-cell-empty" : ""} ${canWrite ? "rm-cell-clickable" : ""}`}
                            onClick={() => {
                              if (!canWrite) return;
                              setEditTarget({
                                serviceId: service.id,
                                serviceName: service.name,
                                period: service.period,
                                month,
                                check,
                              });
                            }}
                          >
                            {check?.checkedAtDisplay || (canWrite ? "Isi tanggal" : "—")}
                          </td>
                          <td
                            className={`rm-cell-note ${empty ? "rm-cell-empty" : ""} ${canWrite ? "rm-cell-clickable" : ""}`}
                            onClick={() => {
                              if (!canWrite) return;
                              setEditTarget({
                                serviceId: service.id,
                                serviceName: service.name,
                                period: service.period,
                                month,
                                check,
                              });
                            }}
                          >
                            <div className="rm-note-content">
                              {check?.noteText ? <span>{check.noteText}</span> : null}
                              {check?.hasImage ? (
                                <a
                                  href={`/api/report-monitoring/checks/${check.id}/image`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rm-thumb-link"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={`/api/report-monitoring/checks/${check.id}/image`}
                                    alt={check.imageName ?? "evidence"}
                                    className="rm-thumb"
                                  />
                                </a>
                              ) : null}
                              {!check?.noteText && !check?.hasImage ? (
                                <span className="rm-placeholder">{canWrite ? "Isi note / gambar" : "—"}</span>
                              ) : null}
                            </div>
                          </td>
                        </Fragment>
                      );
                    })}
                    {canWrite ? (
                      <td className="rm-col-actions">
                        <div className="rm-row-actions">
                          <button
                            type="button"
                            className="btn btn-sm"
                            title="Edit service"
                            onClick={() => setEditService(service)}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            title="Hapus service"
                            onClick={async () => {
                              if (!confirm(`Hapus service "${service.name}" beserta semua pengecekannya?`)) return;
                              const res = await fetch(`/api/report-monitoring/services/${service.id}`, {
                                method: "DELETE",
                              });
                              if (!res.ok) {
                                const d = await res.json().catch(() => ({}));
                                alert(d.error ?? "Gagal menghapus");
                                return;
                              }
                              router.refresh();
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {addOpen ? (
        <AddServiceModal
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            router.refresh();
          }}
        />
      ) : null}

      {editService ? (
        <EditServiceModal
          service={editService}
          onClose={() => setEditService(null)}
          onSaved={() => {
            setEditService(null);
            router.refresh();
          }}
        />
      ) : null}

      {editTarget ? (
        <EditCheckModal
          year={year}
          target={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function ModalShell({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="rm-modal-backdrop" onClick={onClose}>
      <div
        className={`rm-modal ${wide ? "rm-modal-wide" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="rm-modal-header">
          <span className="rm-modal-title">{title}</span>
          <button type="button" className="btn btn-sm" onClick={onClose} aria-label="Tutup">
            <X size={14} />
          </button>
        </div>
        <div className="rm-modal-body">{children}</div>
      </div>
    </div>
  );
}

function AddServiceModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [period, setPeriod] = useState<MonitoringCheckPeriod>("QUARTERLY");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const slots = monthsForPeriod(period);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/report-monitoring/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, period }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof d.error === "string" ? d.error : "Gagal menyimpan");
        return;
      }
      onSaved();
    } catch {
      setError("Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title="Tambah Service" onClose={onClose}>
      <form onSubmit={submit}>
        {error ? <div className="rm-error">{error}</div> : null}
        <div className="form-group">
          <label className="form-label">Nama Service *</label>
          <input
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Grafana"
            autoFocus
          />
        </div>
        <div className="form-group">
          <label className="form-label">Period pengecekan *</label>
          <select
            className="form-select"
            value={period}
            onChange={(e) => setPeriod(e.target.value as MonitoringCheckPeriod)}
          >
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <div className="rm-hint">
            Slot yang harus diisi: {slots.map((m) => monthShortLabel(m)).join(", ")}
          </div>
        </div>
        <div className="rm-modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Menyimpan..." : "Tambah"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function EditServiceModal({
  service,
  onClose,
  onSaved,
}: {
  service: ReportServiceRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(service.name);
  const [period, setPeriod] = useState<MonitoringCheckPeriod>(service.period);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/report-monitoring/services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, period }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof d.error === "string" ? d.error : "Gagal menyimpan");
        return;
      }
      onSaved();
    } catch {
      setError("Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title="Edit Service" onClose={onClose}>
      <form onSubmit={submit}>
        {error ? <div className="rm-error">{error}</div> : null}
        <div className="form-group">
          <label className="form-label">Nama Service *</label>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Period pengecekan *</label>
          <select
            className="form-select"
            value={period}
            onChange={(e) => setPeriod(e.target.value as MonitoringCheckPeriod)}
          >
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {period !== service.period ? (
            <div className="rm-hint rm-hint-warn">
              Mengubah period akan menghapus data di bulan yang tidak lagi berlaku.
            </div>
          ) : null}
        </div>
        <div className="rm-modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function EditCheckModal({
  year,
  target,
  onClose,
  onSaved,
}: {
  year: number;
  target: EditTarget;
  onClose: () => void;
  onSaved: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [checkedAt, setCheckedAt] = useState(target.check?.checkedAt ?? "");
  const [noteText, setNoteText] = useState(target.check?.noteText ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [clearImage, setClearImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const existingImage =
    target.check?.hasImage && !clearImage && !file
      ? `/api/report-monitoring/checks/${target.check.id}/image`
      : null;

  const onPickFile = (f: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setClearImage(false);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.set("year", String(year));
      fd.set("month", String(target.month));
      fd.set("checkedAt", checkedAt || "");
      fd.set("noteText", noteText);
      if (clearImage) fd.set("clearImage", "true");
      if (file) fd.set("file", file);

      const res = await fetch(`/api/report-monitoring/services/${target.serviceId}/checks`, {
        method: "PUT",
        body: fd,
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof d.error === "string" ? d.error : "Gagal menyimpan");
        return;
      }
      onSaved();
    } catch {
      setError("Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title={`Pengecekan · ${monthFullLabel(target.month)} ${year}`}
      onClose={onClose}
      wide
    >
      <form onSubmit={submit}>
        {error ? <div className="rm-error">{error}</div> : null}
        <div className="rm-hint" style={{ marginBottom: 12 }}>
          <strong>{target.serviceName}</strong> · {target.period}
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Tanggal pengecekan</label>
            <input
              type="date"
              className="form-input"
              value={checkedAt}
              onChange={(e) => setCheckedAt(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Upload gambar (opsional)</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="form-input"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Note</label>
          <textarea
            className="form-textarea"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="No issue / Sesuai / catatan audit..."
            rows={3}
          />
        </div>

        {(existingImage || previewUrl) && (
          <div className="rm-preview-wrap">
            <div className="rm-preview-label">
              <ImageIcon size={12} /> Preview bukti
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl ?? existingImage ?? ""} alt="preview" className="rm-preview-img" />
            {existingImage || file ? (
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={() => {
                  onPickFile(null);
                  if (fileRef.current) fileRef.current.value = "";
                  if (existingImage) setClearImage(true);
                }}
              >
                Hapus gambar
              </button>
            ) : null}
          </div>
        )}

        <div className="rm-modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan pengecekan"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
