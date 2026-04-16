"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";

export function ProjectDeleteButton({ projectId, projectName }: { projectId: string; projectName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      className="btn btn-sm"
      style={{ color: "var(--red)", borderColor: "var(--red)" }}
      disabled={loading}
      onClick={async () => {
        if (!confirm(`Hapus project "${projectName}" beserta data terkait? Tindakan ini tidak bisa dibatalkan.`)) return;
        setLoading(true);
        try {
          const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
          if (res.ok) {
            router.push("/projects");
            router.refresh();
          } else {
            const d = await res.json().catch(() => ({}));
            alert(d.error ?? "Gagal menghapus project.");
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
