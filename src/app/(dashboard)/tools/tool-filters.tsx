"use client";
import { useRouter, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";

interface Filter { label: string; value: string; }
export function ToolFilters({ filters, currentCategory, currentQ }: { filters: Filter[]; currentCategory: string; currentQ: string; }) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(currentQ);
  const [, startTransition] = useTransition();

  const push = (category: string, query: string) => {
    const params = new URLSearchParams();
    if (category !== "ALL") params.set("category", category);
    if (query) params.set("q", query);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
      <div className="search-bar">
        <Search size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
        <input placeholder="Cari tool..." value={q} onChange={(e) => { setQ(e.target.value); push(currentCategory, e.target.value); }} />
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {filters.map((f) => (
          <button key={f.value} className={`chip ${currentCategory === f.value ? "active" : ""}`} onClick={() => push(f.value, q)}>{f.label}</button>
        ))}
      </div>
    </div>
  );
}
