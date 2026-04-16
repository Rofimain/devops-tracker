"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";

export function DocDeleteButton({ docId, title }: { docId: string; title: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      className="btn btn-sm"
      style={{ color: "var(--red)", borderColor: "var(--red)" }}
      disabled={loading}
      onClick={async () => {
        if (!confirm(`Hapus dokumentasi "${title}"?`)) return;
        setLoading(true);
        try {
          const res = await fetch(`/api/docs/${docId}`, { method: "DELETE" });
          if (res.ok) {
            router.push("/docs");
            router.refresh();
          } else {
            const d = await res.json().catch(() => ({}));
            alert(d.error ?? "Gagal menghapus dokumen.");
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
