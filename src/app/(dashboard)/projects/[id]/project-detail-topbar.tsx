"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function ProjectDetailTopbar({
  currentSlug,
  currentName,
  projects,
  action,
}: {
  currentSlug: string;
  currentName: string;
  projects: { slug: string; name: string }[];
  action?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="app-topbar">
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 8px", minWidth: 0, flex: "1 1 120px" }}>
        <Link href="/projects" style={{ color: "var(--text-muted)", fontSize: 12, textDecoration: "none" }}>
          Projects
        </Link>
        <span style={{ color: "var(--text-hint)", fontSize: 12 }}>/</span>
        <div ref={wrapRef} style={{ position: "relative", minWidth: 0 }}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text-primary)",
              padding: 0,
              maxWidth: "100%",
            }}
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            <span style={{ wordBreak: "break-word", textAlign: "left" }}>{currentName}</span>
            <ChevronDown size={14} style={{ flexShrink: 0, opacity: 0.7 }} />
          </button>
          {open && (
            <div
              role="listbox"
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                zIndex: 40,
                minWidth: 220,
                maxWidth: 320,
                maxHeight: 280,
                overflowY: "auto",
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              }}
            >
              {projects.map((p) => (
                <button
                  key={p.slug}
                  type="button"
                  role="option"
                  aria-selected={p.slug === currentSlug}
                  onClick={() => {
                    setOpen(false);
                    if (p.slug !== currentSlug) router.push(`/projects/${p.slug}`);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    background: p.slug === currentSlug ? "var(--bg-subtle)" : "transparent",
                    padding: "9px 12px",
                    fontSize: 12,
                    fontWeight: p.slug === currentSlug ? 600 : 400,
                    color: "var(--text-primary)",
                    cursor: "pointer",
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
        <ThemeToggle />
        {action}
      </div>
    </div>
  );
}
