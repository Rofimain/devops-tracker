import { auth } from "@/lib/auth";
import { ensureProjectSchema } from "@/lib/ensure-project-schema";
import { isOperatorRole } from "@/lib/roles";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function PendingApprovalPage() {
  await ensureProjectSchema();
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.accountApproved) {
    redirect(isOperatorRole(session.user.role) ? "/purge" : "/");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "var(--bg-base)",
      }}
    >
      <div className="card" style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
        <div className="card-body" style={{ padding: "28px 22px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, color: "var(--text-primary)" }}>Menunggu persetujuan</div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: 18 }}>
            Akun <strong className="mono">{session.user.email}</strong> sudah terdaftar, tetapi administrator belum menyetujui akses ke portal. Anda akan
            diarahkan otomatis setelah disetujui — silakan refresh halaman nanti.
          </p>
          <Link href="/api/auth/signout?callbackUrl=/login" className="btn" prefetch={false}>
            Keluar
          </Link>
        </div>
      </div>
    </div>
  );
}
