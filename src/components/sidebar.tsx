"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, List, Wrench, FileText, Users, Settings, LogOut, BookMarked, CloudOff, ScrollText, RefreshCw, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";
import { canPurgeCloudflare, isAdminRole, isSuperAdminRole } from "@/lib/roles";

type NavItem =
  | { kind: "section"; label: string; visible: (role: string | undefined) => boolean }
  | {
      kind: "link";
      label: string;
      href: string;
      icon: LucideIcon;
      countKey?: "projects";
      visible: (role: string | undefined) => boolean;
    };

const navItems: NavItem[] = [
  { kind: "section", label: "Main", visible: (r) => r !== "OPERATOR" },
  { kind: "link", label: "Dashboard", href: "/", icon: LayoutDashboard, visible: (r) => r !== "OPERATOR" },
  { kind: "link", label: "Logbook mingguan", href: "/logbook", icon: BookMarked, visible: (r) => r !== "OPERATOR" },
  { kind: "link", label: "Daily Monitoring", href: "/monitoring", icon: ClipboardCheck, visible: (r) => r !== "OPERATOR" },
  { kind: "link", label: "Projects", href: "/projects", icon: List, countKey: "projects", visible: (r) => r !== "OPERATOR" },
  { kind: "section", label: "Resources", visible: (r) => r !== "OPERATOR" },
  { kind: "link", label: "Tools Catalog", href: "/tools", icon: Wrench, visible: (r) => r !== "OPERATOR" },
  { kind: "link", label: "Documentation", href: "/docs", icon: FileText, visible: (r) => r !== "OPERATOR" },
  { kind: "section", label: "CDN", visible: (r) => canPurgeCloudflare(r) },
  { kind: "link", label: "Purge Cloudflare", href: "/purge", icon: CloudOff, visible: (r) => canPurgeCloudflare(r) },
  { kind: "link", label: "CloudFront invalidation", href: "/cloudfront", icon: RefreshCw, visible: (r) => canPurgeCloudflare(r) },
  { kind: "section", label: "Admin", visible: (r) => isAdminRole(r) },
  { kind: "link", label: "Users", href: "/admin/users", icon: Users, visible: (r) => isAdminRole(r) },
  { kind: "link", label: "Log aktivitas", href: "/admin/activity", icon: ScrollText, visible: (r) => isAdminRole(r) },
  { kind: "link", label: "Settings", href: "/settings", icon: Settings, visible: (r) => isSuperAdminRole(r) },
];

export function Sidebar({
  projectCount = 0,
  className,
  onNavigate,
}: {
  projectCount?: number;
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const filtered = navItems.filter((item) => item.visible(role));

  return (
    <aside className={cn("app-sidebar", className)}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <BrandLogo width={46} height={34} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>DevOps Tracker</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>PT. Global Media Visual</div>
        </div>
      </div>

      <nav style={{ padding: "4px 0", flex: 1 }}>
        {filtered.map((item, i) => {
          if (item.kind === "section") {
            return (
              <div key={`${item.label}-${i}`} className="sidebar-section">
                {item.label}
              </div>
            );
          }
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("sidebar-item", isActive(item.href) && "active")}
              onClick={() => onNavigate?.()}
            >
              <Icon size={14} style={{ opacity: 0.8, flexShrink: 0 }} />
              {item.label}
              {item.countKey === "projects" && projectCount > 0 && <span className="count">{projectCount}</span>}
            </Link>
          );
        })}
      </nav>

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
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {session?.user?.name ?? "User"}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{session?.user?.role?.replace("_", " ") ?? "Member"}</div>
          </div>
          <button
            type="button"
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
