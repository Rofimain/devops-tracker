"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CHECK_SLOTS, CHECK_STATUSES, DAILY_ROW_TYPE, MONITORING_STATUSES } from "@/lib/daily-monitoring";
import { formatWibTime, wibTimeInputFromIso } from "@/lib/monitoring-date";

export type MonitoringEntryRow = {
  id: string;
  rowType: string;
  activityCategory: string;
  activity: string;
  activityDate: string;
  activityDateDisplay: string;
  application: string;
  status: string;
  check1At: string | null;
  check1Status: string | null;
  check2At: string | null;
  check2Status: string | null;
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

function DailyCheckCell({
  at,
  status,
  windowLabel,
}: {
  at: string | null;
  status: string | null;
  windowLabel: string;
}) {
  if (status === "Done" && at) {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          borderRadius: 8,
          background: "var(--green-bg, rgba(34, 197, 94, 0.12))",
          border: "1px solid rgba(34, 197, 94, 0.25)",
          minWidth: 120,
        }}
      >
        <CheckCircle2 size={15} style={{ color: "var(--green, #16a34a)", flexShrink: 0 }} />
        <div style={{ lineHeight: 1.25 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{formatWibTime(at)}</div>
          <div style={{ fontSize: 10, color: "var(--green, #16a34a)", fontWeight: 600 }}>Done</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "6px 10px",
        borderRadius: 8,
        background: "var(--surface)",
        border: "1px dashed var(--border)",
        minWidth: 120,
      }}
      title={windowLabel}
    >
      <Clock size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
      <div style={{ lineHeight: 1.25 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>Menunggu</div>
        <div style={{ fontSize: 9, color: "var(--text-hint)" }}>{windowLabel}</div>
      </div>
    </div>
  );
}

type FormState = {
  activity: string;
  activityDate: string;
  application: string;
  status: (typeof MONITORING_STATUSES)[number];
};

const emptyForm = (date: string): FormState => ({
  activity: "",
  activityDate: date,
  application: "All Website Asset",
  status: "Done",
});

type DailyEditForm = {
  application: string;
  status: (typeof MONITORING_STATUSES)[number];
  check1Status: (typeof CHECK_STATUSES)[number];
  check1Time: string;
  check2Status: (typeof CHECK_STATUSES)[number];
  check2Time: string;
};

const dailyEditFromEntry = (entry: MonitoringEntryRow): DailyEditForm => ({
  application: entry.application,
  status: entry.status as DailyEditForm["status"],
  check1Status: (entry.check1Status ?? "Pending") as DailyEditForm["check1Status"],
  check1Time: entry.check1At ? wibTimeInputFromIso(entry.check1At) : "11:30",
  check2Status: (entry.check2Status ?? "Pending") as DailyEditForm["check2Status"],
  check2Time: entry.check2At ? wibTimeInputFromIso(entry.check2At) : "20:30",
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
  const [dailyEditForm, setDailyEditForm] = useState<DailyEditForm | null>(null);

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
        body: JSON.stringify({ ...form, activityCategory: "Optimize" }),
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
      const isDaily = editing.rowType === DAILY_ROW_TYPE;
      const body = isDaily && dailyEditForm
        ? {
            application: dailyEditForm.application,
            status: dailyEditForm.status,
            check1Status: dailyEditForm.check1Status,
            check2Status: dailyEditForm.check2Status,
            ...(dailyEditForm.check1Status === "Done" ? { check1Time: dailyEditForm.check1Time } : {}),
            ...(dailyEditForm.check2Status === "Done" ? { check2Time: dailyEditForm.check2Time } : {}),
          }
        : { ...editForm, activityCategory: "Optimize" };

      const res = await fetch(`/api/monitoring/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : "Gagal menyimpan");
        return;
      }
      setEditing(null);
      setDailyEditForm(null);
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

  const canEditDaily = (entry: MonitoringEntryRow) =>
    canMutate && isAdmin && entry.rowType === DAILY_ROW_TYPE;

  const canManageEntry = (entry: MonitoringEntryRow) =>
    canMutate && entry.rowType !== DAILY_ROW_TYPE && (entry.source === "manual" || isAdmin);

  const colSpan = canMutate ? 9 : 8;

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
              <Plus size={14} /> Entri Optimize
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
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{entries.length} entri</span>
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
        <div
          className="alert-warning"
          style={{ background: "var(--red-bg)", borderColor: "var(--red)", color: "var(--red-text)", marginBottom: 16 }}
        >
          {err}
        </div>
      ) : null}

      {showForm && canMutate && (
        <form onSubmit={submitNew} className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title">Tambah entri Optimize</span>
            <button type="button" className="btn btn-sm" onClick={() => setShowForm(false)}>
              Tutup
            </button>
          </div>
          <div
            className="card-body"
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}
          >
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Activity Category</label>
              <input className="form-input" value="Optimize" readOnly disabled />
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
                placeholder="comofootball.com"
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
            <span className="card-title">
              {editing.rowType === DAILY_ROW_TYPE ? "Edit daily monitoring" : "Edit entri Optimize"}
            </span>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                setEditing(null);
                setDailyEditForm(null);
              }}
            >
              Batal
            </button>
          </div>
          {editing.rowType === DAILY_ROW_TYPE && dailyEditForm ? (
            <div
              className="card-body"
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}
            >
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Date</label>
                <input className="form-input" value={editing.activityDateDisplay} readOnly disabled />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Application</label>
                <input
                  className="form-input"
                  value={dailyEditForm.application}
                  onChange={(e) => setDailyEditForm({ ...dailyEditForm, application: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Daily Check 1 — Status</label>
                <select
                  className="form-select"
                  value={dailyEditForm.check1Status}
                  onChange={(e) =>
                    setDailyEditForm({
                      ...dailyEditForm,
                      check1Status: e.target.value as DailyEditForm["check1Status"],
                    })
                  }
                >
                  {CHECK_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              {dailyEditForm.check1Status === "Done" && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Daily Check 1 — Jam (WIB)</label>
                  <input
                    className="form-input"
                    type="time"
                    value={dailyEditForm.check1Time}
                    onChange={(e) => setDailyEditForm({ ...dailyEditForm, check1Time: e.target.value })}
                  />
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
                    Jendela otomatis: {CHECK_SLOTS[1].windowLabel}
                  </div>
                </div>
              )}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Daily Check 2 — Status</label>
                <select
                  className="form-select"
                  value={dailyEditForm.check2Status}
                  onChange={(e) =>
                    setDailyEditForm({
                      ...dailyEditForm,
                      check2Status: e.target.value as DailyEditForm["check2Status"],
                    })
                  }
                >
                  {CHECK_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              {dailyEditForm.check2Status === "Done" && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Daily Check 2 — Jam (WIB)</label>
                  <input
                    className="form-input"
                    type="time"
                    value={dailyEditForm.check2Time}
                    onChange={(e) => setDailyEditForm({ ...dailyEditForm, check2Time: e.target.value })}
                  />
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
                    Jendela otomatis: {CHECK_SLOTS[2].windowLabel}
                  </div>
                </div>
              )}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Status baris</label>
                <select
                  className="form-select"
                  value={dailyEditForm.status}
                  onChange={(e) =>
                    setDailyEditForm({ ...dailyEditForm, status: e.target.value as DailyEditForm["status"] })
                  }
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
          ) : (
          <div
            className="card-body"
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}
          >
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
          )}
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
                <th style={{ width: 40 }}>No</th>
                <th style={{ minWidth: 130 }}>Date</th>
                <th>Application</th>
                <th style={{ minWidth: 140 }}>Daily Check 1</th>
                <th style={{ minWidth: 140 }}>Daily Check 2</th>
                <th>Category</th>
                <th>Activity</th>
                <th style={{ width: 90 }}>Status</th>
                {canMutate && <th style={{ width: 80 }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                    {isCurrentMonth
                      ? "Belum ada entri bulan ini. Daily checking otomatis terisi setelah jendela 11:00–12:00 dan 20:00–21:00 WIB."
                      : "Tidak ada entri untuk bulan ini."}
                  </td>
                </tr>
              ) : (
                entries.map((entry, i) => {
                  const isDaily = entry.rowType === DAILY_ROW_TYPE;
                  return (
                    <tr key={entry.id}>
                      <td style={{ color: "var(--text-muted)" }}>{i + 1}</td>
                      <td style={{ fontSize: 12, whiteSpace: "nowrap" }}>{entry.activityDateDisplay}</td>
                      <td style={{ fontSize: 12 }}>{entry.application}</td>
                      <td>
                        {isDaily ? (
                          <DailyCheckCell
                            at={entry.check1At}
                            status={entry.check1Status}
                            windowLabel={CHECK_SLOTS[1].windowLabel}
                          />
                        ) : (
                          <span style={{ color: "var(--text-hint)" }}>—</span>
                        )}
                      </td>
                      <td>
                        {isDaily ? (
                          <DailyCheckCell
                            at={entry.check2At}
                            status={entry.check2Status}
                            windowLabel={CHECK_SLOTS[2].windowLabel}
                          />
                        ) : (
                          <span style={{ color: "var(--text-hint)" }}>—</span>
                        )}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {isDaily ? (
                          <span className="badge badge-blue">{entry.activityCategory}</span>
                        ) : (
                          <span className="badge badge-purple">{entry.activityCategory}</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontWeight: 500, fontSize: 12 }}>{entry.activity}</span>
                      </td>
                      <td>
                        <span className={cn("badge", statusBadgeClass(entry.status))}>{entry.status}</span>
                      </td>
                      {canMutate && (
                        <td>
                          {(canEditDaily(entry) || canManageEntry(entry)) && (
                            <div style={{ display: "flex", gap: 4 }}>
                              <button
                                type="button"
                                className="btn btn-sm"
                                disabled={busy}
                                title="Edit"
                                onClick={() => {
                                  setShowForm(false);
                                  if (entry.rowType === DAILY_ROW_TYPE) {
                                    setDailyEditForm(dailyEditFromEntry(entry));
                                  } else {
                                    setDailyEditForm(null);
                                    setEditForm({
                                      activity: entry.activity,
                                      activityDate: entry.activityDate,
                                      application: entry.application,
                                      status: entry.status as FormState["status"],
                                    });
                                  }
                                  setEditing(entry);
                                }}
                              >
                                <Pencil size={13} />
                              </button>
                              {canManageEntry(entry) && (
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                disabled={busy}
                                title="Hapus"
                                onClick={() => remove(entry)}
                              >
                                <Trash2 size={13} />
                              </button>
                              )}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!canMutate && (
        <p style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)" }}>
          Role Member hanya dapat melihat laporan. Menambah entri Optimize hanya untuk Admin / Super Admin.
        </p>
      )}
    </div>
  );
}
