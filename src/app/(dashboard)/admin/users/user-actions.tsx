"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ROLES = ["MEMBER", "ADMIN", "OPERATOR"] as const;

export function UserActions({
  userId,
  currentRole,
  accountApproved,
}: {
  userId: string;
  currentRole: string;
  accountApproved: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const changeRole = async (role: string) => {
    if (role === currentRole) return;
    setErr("");
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : `Gagal (${res.status})`);
        return;
      }
      router.refresh();
    } catch {
      setErr("Gagal menyimpan role");
    } finally {
      setLoading(false);
    }
  };

  const approve = async () => {
    setErr("");
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/approve`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : `Gagal (${res.status})`);
        return;
      }
      router.refresh();
    } catch {
      setErr("Gagal menyetujui");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        <select
          key={`${userId}-${currentRole}`}
          className="form-select"
          style={{ width: "auto", minWidth: 120, padding: "3px 8px", fontSize: 11 }}
          defaultValue={currentRole}
          onChange={(e) => changeRole(e.target.value)}
          disabled={loading}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        {!accountApproved ? (
          <button type="button" className="btn btn-primary btn-sm" disabled={loading} onClick={approve}>
            Setujui akses
          </button>
        ) : null}
      </div>
      {err ? <span style={{ fontSize: 10, color: "var(--red-text)" }}>{err}</span> : null}
    </div>
  );
}
