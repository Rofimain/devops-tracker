"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";

interface Filter { label: string; value: string; }

export function ProjectFilters({
  filters,
  currentStatus,
  currentQ,
  currentSort,
  currentDir,
}: {
  filters: Filter[];
  currentStatus: string;
  currentQ: string;
  currentSort?: string;
  currentDir?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(currentQ);
  const [, startTransition] = useTransition();

  const push = (status: string, query: string) => {
    const params = new URLSearchParams();
    if (status && status !== "ALL") params.set("status", status);
    if (query) params.set("q", query);
    if (currentSort) params.set("sort", currentSort);
    if (currentDir) params.set("dir", currentDir);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
      <div className="search-bar">
        <Search size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
        <input
          placeholder="Cari project..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            push(currentStatus, e.target.value);
          }}
        />
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {filters.map((f) => (
          <button key={f.value} className={`chip ${currentStatus === f.value ? "active" : ""}`} onClick={() => push(f.value, q)}>
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
