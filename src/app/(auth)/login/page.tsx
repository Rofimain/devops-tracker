import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { AlertTriangle } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export default async function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  const session = await auth();
  if (session) redirect("/");

  const errorMessages: Record<string, string> = {
    OAuthAccountNotLinked: "Email ini sudah terdaftar dengan metode login lain.",
    AccessDenied: `Email kamu tidak diizinkan. Hanya email @${process.env.ALLOWED_EMAIL_DOMAIN} yang bisa login.`,
    Default: "Terjadi kesalahan. Silakan coba lagi.",
  };
  const errorMsg = searchParams.error ? (errorMessages[searchParams.error] ?? errorMessages.Default) : null;

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-base)" }}>
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "32px 28px", width: 360, maxWidth: "95vw" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              width: "100%",
              maxWidth: 220,
              margin: "0 auto 14px",
              padding: "10px 12px",
              background: "#fff",
              borderRadius: 12,
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BrandLogo width={196} height={52} priority />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>DevOps Tracker</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>PT. Global Media Visual</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Sign in ke Internal DevOps Portal</div>
        </div>

        {/* Error */}
        {errorMsg && (
          <div style={{ background: "var(--red-bg)", border: "1px solid var(--red)", borderRadius: 8, padding: "10px 12px", marginBottom: 16, display: "flex", gap: 8, alignItems: "flex-start" }}>
            <AlertTriangle size={14} style={{ color: "var(--red)", flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 12, color: "var(--red-text)" }}>{errorMsg}</span>
          </div>
        )}

        {/* Google Sign In */}
        <form action={async () => { "use server"; await signIn("google", { redirectTo: "/" }); }}>
          <button type="submit" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: "11px 16px", border: "1px solid var(--border-mid)", borderRadius: 8, background: "var(--bg-raised)", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--text-primary)", transition: "background 0.1s" }}>
            {/* Google Icon SVG */}
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
        </form>

        {/* Domain notice */}
        <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", marginTop: 14, fontSize: 12, color: "var(--text-secondary)", textAlign: "center", lineHeight: 1.45 }}>
          Hanya email <strong>@{process.env.ALLOWED_EMAIL_DOMAIN}</strong>. Akun baru perlu disetujui Super Admin di menu Users sebelum bisa mengakses portal.
        </div>

        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)", textAlign: "center", fontSize: 11, color: "var(--text-hint)" }}>
          DevOps Tracker v1.0 · Internal Use Only
        </div>
      </div>
    </div>
  );
}
