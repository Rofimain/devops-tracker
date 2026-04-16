"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";

export function ToolDeleteButton({ toolId, toolName, usedInProjects }: { toolId: string; toolName: string; usedInProjects: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      className="btn btn-sm"
      style={{ color: "var(--red)", borderColor: "var(--red)" }}
      disabled={loading}
      onClick={async () => {
        const msg =
          usedInProjects > 0
            ? `Hapus tool "${toolName}"? Link ke ${usedInProjects} project akan dihapus. Lanjutkan?`
            : `Hapus tool "${toolName}"?`;
        if (!confirm(msg)) return;
        setLoading(true);
        try {
          const res = await fetch(`/api/tools/${toolId}`, { method: "DELETE" });
          if (res.ok) {
            router.push("/tools");
            router.refresh();
          } else {
            const d = await res.json().catch(() => ({}));
            alert(d.error ?? "Gagal menghapus tool.");
          }
        } finally {
          setLoading(false);
        }
      }}
    >
      <Trash2 size={12} /> {loading ? "…" : "Hapus"}
    </button>
  );
}
