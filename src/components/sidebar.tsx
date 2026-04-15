"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LayoutDashboard, List, Wrench, FileText, Users, Settings, LogOut, Server } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

const navItems = [
  { section: "Main" },
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: List, countKey: "projects" },
  { section: "Resources" },
  { label: "Tools Catalog", href: "/tools", icon: Wrench },
  { label: "Documentation", href: "/docs", icon: FileText },
  { section: "Admin" },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar({ projectCount = 0 }: { projectCount?: number }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  };

  return (
    <aside className="app-sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Server size={16} color="white" />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>DevOps Tracker</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Internal Portal</div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ padding: "4px 0", flex: 1 }}>
        {navItems.map((item, i) => {
          if ("section" in item) {
            return <div key={i} className="sidebar-section">{item.section}</div>;
          }
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={cn("sidebar-item", isActive(item.href) && "active")}>
              <Icon size={14} style={{ opacity: 0.8, flexShrink: 0 }} />
              {item.label}
              {item.countKey === "projects" && projectCount > 0 && (
                <span className="count">{projectCount}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="sidebar-footer">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {session?.user?.image ? (
            <Image src={session.user.image} alt="avatar" width={28} height={28} style={{ borderRadius: "50%" }} />
          ) : (
            <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
              {getInitials(session?.user?.name)}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {session?.user?.name ?? "User"}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
              {session?.user?.role?.replace("_", " ") ?? "Member"}
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, borderRadius: 6 }}
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
