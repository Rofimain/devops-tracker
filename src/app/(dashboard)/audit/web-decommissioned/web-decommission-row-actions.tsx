"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

export function WebDecommissionRowActions({
  id,
  platformName,
  canWrite,
}: {
  id: string;
  platformName: string;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!canWrite || deleting) return;
    if (!confirm(`Hapus dokumentasi "${platformName}"?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/web-decommissioned/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Gagal menghapus");
        return;
      }
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="wd-row-actions">
      <Link href={`/audit/web-decommissioned/${id}`} className="btn btn-sm" title="Lihat / Edit">
        <Pencil size={12} /> {canWrite ? "Edit" : "Lihat"}
      </Link>
      {canWrite && (
        <button
          type="button"
          className="btn btn-sm btn-danger"
          disabled={deleting}
          onClick={() => void handleDelete()}
          title="Hapus"
        >
          <Trash2 size={12} /> {deleting ? "…" : "Hapus"}
        </button>
      )}
    </div>
  );
}
