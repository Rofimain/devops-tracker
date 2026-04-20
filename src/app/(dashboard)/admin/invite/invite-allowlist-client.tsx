"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { timeAgo } from "@/lib/utils";

const ROLES = [
  { value: "MEMBER", label: "Member (baca)" },
  { value: "ADMIN", label: "Admin" },
  { value: "OPERATOR", label: "Operator (purge)" },
] as const;

type Row = {
  id: string;
  email: string;
  note: string | null;
  invitedRole: string;
  createdAt: string;
  invitedBy: { name: string | null; email: string } | null;
};

export function InviteAllowlistClient({ initialRows, domain }: { initialRows: Row[]; domain: string }) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [invitedRole, setInvitedRole] = useState<string>("MEMBER");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/login-allowlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), note: note.trim() || undefined, invitedRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Gagal");
        return;
      }
      setRows((r) => [data, ...r]);
      setEmail("");
      setNote("");
      setInvitedRole("MEMBER");
      router.refresh();
    } catch {
      setErr("Gagal menambah");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Hapus dari daftar undangan?")) return;
    const res = await fetch(`/api/login-allowlist/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRows((r) => r.filter((x) => x.id !== id));
      router.refresh();
    }
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">Tambah email</span>
        </div>
        <div className="card-body">
          <form onSubmit={add} className="grid-2" style={{ alignItems: "flex-end", gap: 12 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Email @{domain}</label>
              <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={`nama@${domain}`} required />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Role setelah login</label>
              <select className="form-select" value={invitedRole} onChange={(e) => setInvitedRole(e.target.value)}>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: 10, color: "var(--text-hint)", marginTop: 4 }}>
                Super Admin hanya lewat variabel <span className="mono">SUPER_ADMIN_EMAIL</span>, bukan dari undangan.
              </div>
            </div>
            <div className="form-group" style={{ margin: 0, gridColumn: "1 / -1" }}>
              <label className="form-label">Catatan (opsional)</label>
              <input className="form-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Divisi / alasan" />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              {err ? <div className="alert-warning" style={{ marginBottom: 10 }}>{err}</div> : null}
              <button type="submit" className="btn btn-primary" disabled={loading}>
                <Plus size={14} /> Daftarkan
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Daftar undangan ({rows.length})</span>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Catatan</th>
                <th>Diundang oleh</th>
                <th>Waktu</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: 24 }}>
                    Kosong — login terbuka untuk semua @{domain}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td className="mono" style={{ fontWeight: 600 }}>
                      {r.email}
                    </td>
                    <td>
                      <span className="badge badge-blue" style={{ fontSize: 10 }}>
                        {r.invitedRole}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>{r.note ?? "—"}</td>
                    <td style={{ fontSize: 12 }}>{r.invitedBy?.name ?? r.invitedBy?.email ?? "—"}</td>
                    <td style={{ fontSize: 11, color: "var(--text-muted)" }}>{timeAgo(new Date(r.createdAt))}</td>
                    <td>
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(r.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
