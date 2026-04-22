import { auth, isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Topbar } from "@/components/topbar";
import { InviteAllowlistClient } from "./invite-allowlist-client";

export default async function AdminInvitePage() {
  const session = await auth();
  if (!isSuperAdmin(session?.user?.role)) redirect("/");

  const rows = await prisma.loginAllowlist.findMany({
    orderBy: { createdAt: "desc" },
    include: { invitedBy: { select: { name: true, email: true } } },
  });

  return (
    <>
      <Topbar title="Undangan login" breadcrumb="Admin" />
      <div className="app-content">
        <div className="alert-info" style={{ marginBottom: 16 }}>
          Jika ada <strong>minimal satu</strong> email di daftar ini, yang bisa login pertama kali: email di daftar ini, Super Admin dari env, dan siapa pun yang <strong>sudah punya akun</strong> di portal (supaya tim lama tidak terkunci). Orang baru dengan domain saja tanpa undangan + belum pernah terdaftar tetap ditolak.
          Jika daftar <strong>kosong</strong>, siapa pun dengan domain @{process.env.ALLOWED_EMAIL_DOMAIN} tetap bisa login (mode lama / dev).
          <br />
          <span style={{ marginTop: 8, display: "inline-block" }}>
            User <strong>baru</strong> setelah login tetap harus <strong>disetujui</strong> di menu Users sebelum bisa membuka dashboard. Email undangan butuh <span className="mono">RESEND_API_KEY</span> di env (lihat .env.example).
          </span>
        </div>
        <InviteAllowlistClient initialRows={JSON.parse(JSON.stringify(rows))} domain={process.env.ALLOWED_EMAIL_DOMAIN ?? ""} />
      </div>
    </>
  );
}
