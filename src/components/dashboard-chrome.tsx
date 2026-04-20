"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/sidebar";
import { SessionActivityClient } from "@/components/session-activity-client";

export function DashboardChrome({ children, projectCount }: { children: React.ReactNode; projectCount: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="app-layout">
      <SessionActivityClient />
      <Sidebar projectCount={projectCount} className={cn(open && "is-open")} onNavigate={() => setOpen(false)} />
      {open ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Tutup menu"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <div className="app-main">
        <div className="mobile-app-bar">
          <button type="button" className="mobile-menu-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? "Tutup menu" : "Buka menu"}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="mobile-app-bar-title">DevOps Tracker</span>
        </div>
        {children}
      </div>
    </div>
  );
}
