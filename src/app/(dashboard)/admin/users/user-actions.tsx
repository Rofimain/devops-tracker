"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const ROLES = ["MEMBER", "ADMIN", "OPERATOR"];

export function UserActions({ userId, currentRole }: { userId: string; currentRole: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const changeRole = async (role: string) => {
    if (role === currentRole) return;
    setLoading(true);
    await fetch(`/api/users/${userId}/role`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setLoading(false);
    router.refresh();
  };

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <select
        className="form-select"
        style={{ width: "auto", padding: "3px 8px", fontSize: 11 }}
        defaultValue={currentRole}
        onChange={(e) => changeRole(e.target.value)}
        disabled={loading}
      >
        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
    </div>
  );
}
