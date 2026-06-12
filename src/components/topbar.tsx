import { ThemeToggle } from "./theme-toggle";
import Link from "next/link";

interface TopbarProps {
  title: string;
  breadcrumb?: string;
  breadcrumbHref?: string;
  action?: React.ReactNode;
}

export function Topbar({ title, breadcrumb, breadcrumbHref, action }: TopbarProps) {
  return (
    <div className="app-topbar">
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 8px", minWidth: 0, flex: "1 1 120px" }}>
        {breadcrumb && (
          <>
            {breadcrumbHref ? (
              <Link href={breadcrumbHref} style={{ color: "var(--text-muted)", fontSize: 12, textDecoration: "none" }}>
                {breadcrumb}
              </Link>
            ) : (
              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{breadcrumb}</span>
            )}
            <span style={{ color: "var(--text-hint)", fontSize: 12 }}>/</span>
          </>
        )}
        <h1 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: 0, minWidth: 0, wordBreak: "break-word" }}>{title}</h1>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
        <ThemeToggle />
        {action}
      </div>
    </div>
  );
}
