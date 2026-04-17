"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BookMarked, ChevronLeft, ChevronRight, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { LOGBOOK_CATEGORIES, type IsoWeek, type LogbookCategoryId } from "@/lib/logbook-week";

export type LogbookEntryRow = {
  id: string;
  userId: string;
  category: string;
  title: string;
  body: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string; image: string | null };
};

function railColor(category: string) {
  const c = LOGBOOK_CATEGORIES.find((x) => x.id === category);
  switch (c?.accent) {
    case "accent":
      return "var(--accent)";
    case "purple":
      return "var(--purple)";
    case "red":
      return "var(--red)";
    case "yellow":
      return "var(--yellow)";
    default:
      return "var(--text-hint)";
  }
}

function categoryLabel(category: string) {
  return LOGBOOK_CATEGORIES.find((x) => x.id === category)?.label ?? category;
}

export function LogbookWeekView({
  initialEntries,
  week,
  weekHuman,
  prevHref,
  nextHref,
  thisWeekHref,
  isCurrentWeek,
  currentUserId,
  isAdmin,
}: {
  initialEntries: LogbookEntryRow[];
  week: IsoWeek;
  weekHuman: string;
  prevHref: string;
  nextHref: string;
  thisWeekHref: string;
  isCurrentWeek: boolean;
  currentUserId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [entries, setEntries] = useState(initialEntries);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<LogbookCategoryId>("note");
  const [editing, setEditing] = useState<LogbookEntryRow | null>(null);

  useEffect(() => {
    setEntries(initialEntries);
  }, [initialEntries]);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of entries) m[e.category] = (m[e.category] ?? 0) + 1;
    return m;
  }, [entries]);

  const refresh = () => router.refresh();

  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErr("Judul wajib diisi.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/logbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isoYear: week.isoYear,
          isoWeek: week.isoWeek,
          category,
          title: title.trim(),
          body: body.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : "Gagal menyimpan");
        return;
      }
      setEntries((prev) => [data, ...prev]);
      setTitle("");
      setBody("");
      setCategory("note");
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
      const res = await fetch(`/api/logbook/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: editing.category,
          title: editing.title.trim(),
          body: editing.body.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : "Gagal menyimpan");
        return;
      }
      setEntries((prev) => prev.map((x) => (x.id === data.id ? { ...x, ...data, user: x.user } : x)));
      setEditing(null);
      refresh();
    } catch {
      setErr("Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Hapus entri ini?")) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/logbook/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setErr(data.error ?? "Gagal menghapus");
        return;
      }
      setEntries((prev) => prev.filter((x) => x.id !== id));
      if (editing?.id === id) setEditing(null);
      refresh();
    } catch {
      setErr("Gagal menghapus");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="logbook-shell">
      <header className="logbook-hero">
        <div className="logbook-hero-inner">
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
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
                boxShadow: "0 6px 20px rgba(37, 99, 235, 0.35)",
              }}
            >
              <BookMarked size={24} color="#fff" />
            </div>
            <div style={{ flex: "1 1 220px", minWidth: 0 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
                DevOps logbook
              </h2>
              <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.55, color: "var(--text-secondary)", maxWidth: 520 }}>
                Satu halaman untuk semua catatan mingguan: rilis, insiden, perubahan infrastruktur, dan hal penting lainnya — mudah
                ditambah dan dibaca ulang.
              </p>
            </div>
          </div>

          <div className="logbook-week-nav">
            <Link href={prevHref} className="btn" style={{ padding: "8px 11px" }} aria-label="Minggu sebelumnya">
              <ChevronLeft size={18} />
            </Link>
            <div className="logbook-week-pill">
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                ISO minggu
              </span>
              <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>
                {week.isoYear} · W{String(week.isoWeek).padStart(2, "0")}
              </span>
              <span style={{ width: 1, height: 18, background: "var(--border)", margin: "0 4px" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>{weekHuman}</span>
            </div>
            <Link href={nextHref} className="btn" style={{ padding: "8px 11px" }} aria-label="Minggu berikutnya">
              <ChevronRight size={18} />
            </Link>
            {!isCurrentWeek && (
              <Link href={thisWeekHref} className="btn btn-primary" style={{ textDecoration: "none" }}>
                Kembali ke minggu ini
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="logbook-stat-row">
        {LOGBOOK_CATEGORIES.map((c) => (
          <span key={c.id} className="logbook-stat-chip">
            <span style={{ display: "inline-block", background: railColor(c.id) }} className="logbook-stat-dot" />
            {c.label}
            <span style={{ color: "var(--text-muted)", fontWeight: 700 }}>{counts[c.id] ?? 0}</span>
          </span>
        ))}
      </div>

      {err ? (
        <div className="alert-warning" style={{ background: "var(--red-bg)", borderColor: "var(--red)", color: "var(--red-text)" }}>
          {err}
        </div>
      ) : null}

      <div className="logbook-layout">
        <div className="logbook-entry-list">
          {entries.length === 0 ? (
            <div className="logbook-empty">
              Minggu ini masih kosong. Gunakan formulir di kanan untuk menambahkan entri pertama — tim Anda akan melihatnya di sini.
            </div>
          ) : (
            entries.map((entry) => {
              const canEdit = entry.userId === currentUserId || isAdmin;
              return (
                <article key={entry.id} className="logbook-entry">
                  <div style={{ background: railColor(entry.category) }} aria-hidden />
                  <div className="logbook-entry-body">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <span className="badge badge-gray" style={{ fontSize: 9, marginBottom: 6 }}>
                          {categoryLabel(entry.category)}
                        </span>
                        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "6px 0 0", lineHeight: 1.35 }}>{entry.title}</h3>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 11, color: "var(--text-muted)" }}>
                          {entry.user.image ? (
                            <Image src={entry.user.image} alt="" width={22} height={22} style={{ borderRadius: "50%" }} />
                          ) : (
                            <div className="avatar" style={{ width: 22, height: 22, fontSize: 9 }}>
                              {(entry.user.name ?? entry.user.email).slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{entry.user.name ?? entry.user.email}</span>
                          <span aria-hidden>·</span>
                          <time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time>
                        </div>
                      </div>
                      {canEdit && (
                        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                          <button type="button" className="btn btn-sm" disabled={busy} onClick={() => setEditing(entry)} title="Edit">
                            <Pencil size={14} />
                          </button>
                          <button type="button" className="btn btn-sm btn-danger" disabled={busy} onClick={() => remove(entry.id)} title="Hapus">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>
                      {entry.body || "—"}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <aside className="logbook-aside">
          {editing ? (
            <form onSubmit={saveEdit} className="card logbook-sticky">
              <div className="card-header">
                <span className="card-title">Edit entri</span>
                <button type="button" className="btn btn-sm" onClick={() => setEditing(null)}>
                  Batal
                </button>
              </div>
              <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Kategori</label>
                  <select
                    className="form-select"
                    value={editing.category}
                    onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  >
                    {LOGBOOK_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Judul</label>
                  <input className="form-input" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Detail</label>
                  <textarea className="form-textarea" rows={8} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
                </div>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? (
                    <>
                      <Loader2 size={16} className="logbook-spin" /> Menyimpan…
                    </>
                  ) : (
                    "Simpan perubahan"
                  )}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={submitNew} className="card logbook-sticky">
              <div className="card-header">
                <span className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Plus size={16} /> Entri baru
                </span>
              </div>
              <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Kategori</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {LOGBOOK_CATEGORIES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={category === c.id ? "btn btn-primary logbook-cat-btn" : "btn logbook-cat-btn"}
                        onClick={() => setCategory(c.id)}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Judul singkat *</label>
                  <input
                    className="form-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Deploy API billing ke production"
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Detail</label>
                  <textarea
                    className="form-textarea"
                    rows={9}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Ringkas apa yang dilakukan, PR/ticket, dampak, atau lesson learned…"
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? (
                    <>
                      <Loader2 size={16} className="logbook-spin" /> Menyimpan…
                    </>
                  ) : (
                    "Tambahkan ke logbook"
                  )}
                </button>
              </div>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
