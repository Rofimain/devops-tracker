import { ThemeToggle } from "./theme-toggle";

interface TopbarProps {
  title: string;
  breadcrumb?: string;
  action?: React.ReactNode;
}

export function Topbar({ title, breadcrumb, action }: TopbarProps) {
  return (
    <div className="app-topbar">
      {breadcrumb && (
        <>
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{breadcrumb}</span>
          <span style={{ color: "var(--text-hint)", fontSize: 12 }}>/</span>
        </>
      )}
      <h1 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{title}</h1>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        <ThemeToggle />
        {action}
      </div>
    </div>
  );
}
