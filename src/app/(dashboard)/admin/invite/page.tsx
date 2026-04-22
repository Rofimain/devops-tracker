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
          Jika ada <strong>minimal satu</strong> email di daftar ini, hanya email tersebut (plus Super Admin dari env) yang bisa login dengan Google — meskipun domain sama @{process.env.ALLOWED_EMAIL_DOMAIN}.
          Jika daftar <strong>kosong</strong>, siapa pun dengan domain tersebut tetap bisa login (mode lama / dev).
          <br />
          <span style={{ marginTop: 8, display: "inline-block" }}>
            User <strong>baru</strong> setelah login tetap harus <strong>disetujui</strong> di menu Users sebelum bisa membuka dashboard.
          </span>
        </div>
        <InviteAllowlistClient initialRows={JSON.parse(JSON.stringify(rows))} domain={process.env.ALLOWED_EMAIL_DOMAIN ?? ""} />
      </div>
    </>
  );
}
