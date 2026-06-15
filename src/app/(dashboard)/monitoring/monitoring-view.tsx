"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, ChevronLeft, ChevronRight, ClipboardCheck, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MONITORING_CATEGORIES, MONITORING_STATUSES } from "@/lib/daily-monitoring";

export type MonitoringEntryRow = {
  id: string;
  activityCategory: string;
  activity: string;
  activityDate: string;
  activityDateDisplay: string;
  application: string;
  status: string;
  source: string;
  userId: string | null;
};

function statusBadgeClass(status: string) {
  switch (status) {
    case "Done":
      return "badge-green";
    case "In Progress":
      return "badge-yellow";
    case "Pending":
      return "badge-gray";
    default:
      return "badge-gray";
  }
}

type FormState = {
  activityCategory: (typeof MONITORING_CATEGORIES)[number];
  activity: string;
  activityDate: string;
  application: string;
  status: (typeof MONITORING_STATUSES)[number];
};

const emptyForm = (date: string): FormState => ({
  activityCategory: "Monitoring",
  activity: "",
  activityDate: date,
  application: "All Website Asset",
  status: "Done",
});

export function MonitoringView({
  initialEntries,
  monthHuman,
  prevHref,
  nextHref,
  thisMonthHref,
  isCurrentMonth,
  todayWib,
  isAdmin,
  canMutate = true,
}: {
  initialEntries: MonitoringEntryRow[];
  monthHuman: string;
  prevHref: string;
  nextHref: string;
  thisMonthHref: string;
  isCurrentMonth: boolean;
  todayWib: string;
  isAdmin: boolean;
  canMutate?: boolean;
}) {
  const router = useRouter();
  const [entries, setEntries] = useState(initialEntries);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(() => emptyForm(todayWib));
  const [editing, setEditing] = useState<MonitoringEntryRow | null>(null);
  const [editForm, setEditForm] = useState<FormState>(() => emptyForm(todayWib));

  useEffect(() => {
    setEntries(initialEntries);
  }, [initialEntries]);

  const refresh = () => router.refresh();

  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.activity.trim()) {
      setErr("Activity wajib diisi.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : "Gagal menyimpan");
        return;
      }
      setShowForm(false);
      setForm(emptyForm(todayWib));
      refresh();
    } catch {
      setErr("Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/monitoring/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : "Gagal menyimpan");
        return;
      }
      setEditing(null);
      refresh();
    } catch {
      setErr("Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (entry: MonitoringEntryRow) => {
    if (!confirm(`Hapus entri "${entry.activity}"?`)) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/monitoring/${entry.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setErr(data.error ?? "Gagal menghapus");
        return;
      }
      setEntries((prev) => prev.filter((x) => x.id !== entry.id));
      if (editing?.id === entry.id) setEditing(null);
      refresh();
    } catch {
      setErr("Gagal menghapus");
    } finally {
      setBusy(false);
    }
  };

  const canManageEntry = (entry: MonitoringEntryRow) =>
    canMutate && (entry.source === "manual" || isAdmin);

  return (
    <div>
      <header
        style={{
          marginBottom: 20,
          padding: "20px 22px",
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flex: "1 1 280px" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <ClipboardCheck size={24} color="#fff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>
                DevOps Daily Monitoring
              </h2>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text-secondary)", maxWidth: 560, lineHeight: 1.5 }}>
                Laporan aktivitas monitoring harian. Entri &quot;Daily monitoring&quot; otomatis terisi setiap hari jam 15:00 WIB.
                Anda tetap bisa menambah entri manual untuk aktivitas lain.
              </p>
            </div>
          </div>
          {canMutate && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setEditing(null);
                setForm(emptyForm(todayWib));
                setShowForm((v) => !v);
              }}
            >
              <Plus size={14} /> Entri manual
            </button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
          <Link href={prevHref} className="btn" style={{ padding: "8px 11px" }} aria-label="Bulan sebelumnya">
            <ChevronLeft size={18} />
          </Link>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--bg)",
            }}
          >
            <Activity size={14} style={{ color: "var(--text-muted)" }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{monthHuman}</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {entries.length} entri
            </span>
          </div>
          <Link href={nextHref} className="btn" style={{ padding: "8px 11px" }} aria-label="Bulan berikutnya">
            <ChevronRight size={18} />
          </Link>
          {!isCurrentMonth && (
            <Link href={thisMonthHref} className="btn" style={{ textDecoration: "none" }}>
              Bulan ini
            </Link>
          )}
        </div>
      </header>

      {err ? (
        <div className="alert-warning" style={{ background: "var(--red-bg)", borderColor: "var(--red)", color: "var(--red-text)", marginBottom: 16 }}>
          {err}
        </div>
      ) : null}

      {showForm && canMutate && (
        <form onSubmit={submitNew} className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title">Tambah entri manual</span>
            <button type="button" className="btn btn-sm" onClick={() => setShowForm(false)}>
              Tutup
            </button>
          </div>
          <div className="card-body" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Activity Category</label>
              <select
                className="form-select"
                value={form.activityCategory}
                onChange={(e) => setForm({ ...form, activityCategory: e.target.value as FormState["activityCategory"] })}
              >
                {MONITORING_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Activity *</label>
              <input
                className="form-input"
                value={form.activity}
                onChange={(e) => setForm({ ...form, activity: e.target.value })}
                placeholder="Contoh: Purge cache mysql"
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Date</label>
              <input
                className="form-input"
                type="date"
                value={form.activityDate}
                onChange={(e) => setForm({ ...form, activityDate: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Application</label>
              <input
                className="form-input"
                value={form.application}
                onChange={(e) => setForm({ ...form, application: e.target.value })}
                placeholder="All Website Asset"
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as FormState["status"] })}
              >
                {MONITORING_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: "100%" }}>
                {busy ? <Loader2 size={16} className="logbook-spin" /> : "Simpan"}
              </button>
            </div>
          </div>
        </form>
      )}

      {editing && canMutate && (
        <form onSubmit={saveEdit} className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title">Edit entri</span>
            <button type="button" className="btn btn-sm" onClick={() => setEditing(null)}>
              Batal
            </button>
          </div>
          <div className="card-body" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Activity Category</label>
              <select
                className="form-select"
                value={editForm.activityCategory}
                onChange={(e) => setEditForm({ ...editForm, activityCategory: e.target.value as FormState["activityCategory"] })}
              >
                {MONITORING_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Activity</label>
              <input className="form-input" value={editForm.activity} onChange={(e) => setEditForm({ ...editForm, activity: e.target.value })} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Date</label>
              <input
                className="form-input"
                type="date"
                value={editForm.activityDate}
                onChange={(e) => setEditForm({ ...editForm, activityDate: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Application</label>
              <input className="form-input" value={editForm.application} onChange={(e) => setEditForm({ ...editForm, application: e.target.value })} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value as FormState["status"] })}
              >
                {MONITORING_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: "100%" }}>
                {busy ? <Loader2 size={16} className="logbook-spin" /> : "Simpan perubahan"}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">Activity Log — {monthHuman}</span>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 48 }}>No</th>
                <th>Activity Category</th>
                <th>Activity</th>
                <th style={{ minWidth: 140 }}>Date</th>
                <th>Application</th>
                <th style={{ width: 100 }}>Status</th>
                {canMutate && <th style={{ width: 90 }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={canMutate ? 7 : 6} style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                    {isCurrentMonth
                      ? "Belum ada entri bulan ini. Entri harian otomatis akan muncul setiap jam 15:00 WIB."
                      : "Tidak ada entri untuk bulan ini."}
                  </td>
                </tr>
              ) : (
                entries.map((entry, i) => (
                  <tr key={entry.id}>
                    <td style={{ color: "var(--text-muted)" }}>{i + 1}</td>
                    <td style={{ fontSize: 12 }}>{entry.activityCategory}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 500 }}>{entry.activity}</span>
                        {entry.source === "auto" && (
                          <span className="badge badge-blue" style={{ fontSize: 9 }}>
                            Otomatis
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, whiteSpace: "nowrap" }}>{entry.activityDateDisplay}</td>
                    <td style={{ fontSize: 12 }}>{entry.application}</td>
                    <td>
                      <span className={cn("badge", statusBadgeClass(entry.status))}>{entry.status}</span>
                    </td>
                    {canMutate && (
                      <td>
                        {canManageEntry(entry) && (
                          <div style={{ display: "flex", gap: 4 }}>
                            <button
                              type="button"
                              className="btn btn-sm"
                              disabled={busy}
                              title="Edit"
                              onClick={() => {
                                setShowForm(false);
                                setEditForm({
                                  activityCategory: entry.activityCategory as FormState["activityCategory"],
                                  activity: entry.activity,
                                  activityDate: entry.activityDate,
                                  application: entry.application,
                                  status: entry.status as FormState["status"],
                                });
                                setEditing(entry);
                              }}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              disabled={busy}
                              title="Hapus"
                              onClick={() => remove(entry)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!canMutate && (
        <p style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)" }}>
          Role Member hanya dapat melihat laporan. Menambah atau mengubah entri hanya untuk Admin / Super Admin.
        </p>
      )}
    </div>
  );
}
