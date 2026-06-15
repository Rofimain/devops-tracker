import { auth, isSuperAdmin, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/topbar";
import { redirect } from "next/navigation";
import { UserActions } from "./user-actions";
import { ROLE_COLORS } from "@/lib/utils";
import { timeAgo } from "@/lib/utils";
import { formatAllowedDomainsDisplay } from "@/lib/allowed-email-domains";
import Image from "next/image";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!isAdmin(session?.user?.role)) redirect("/");

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  const allowedLabel = formatAllowedDomainsDisplay();

  return (
    <>
      <Topbar title="User Management" />
      <div className="app-content">
        <div className="alert-warning">
          {allowedLabel ? (
            <>
              Hanya email <strong>{allowedLabel}</strong> yang dapat login ke aplikasi ini.
            </>
          ) : (
            <>Login tidak dibatasi domain email (variabel ALLOWED_EMAIL_* kosong).</>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Team Members ({users.length})</span>
            {isSuperAdmin(session?.user?.role) && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Super Admin dapat mengubah role atau menghapus user</span>}
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Akses</th>
                  <th>Joined</th>
                  {isSuperAdmin(session?.user?.role) && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {user.image ? (
                          <Image src={user.image} alt="" width={26} height={26} style={{ borderRadius: "50%" }} />
                        ) : (
                          <div className="avatar" style={{ width: 26, height: 26, fontSize: 10 }}>
                            {(user.name ?? user.email ?? "U").slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span style={{ fontWeight: 600 }}>{user.name ?? "—"}</span>
                        {user.id === session?.user?.id && <span className="badge badge-gray" style={{ fontSize: 9 }}>You</span>}
                      </div>
                    </td>
                    <td className="mono">{user.email}</td>
                    <td>
                      <span className={`badge ${ROLE_COLORS[user.role]}`}>{user.role.replace("_", " ")}</span>
                    </td>
                    <td>
                      {user.accountApproved ? (
                        <span className="badge badge-green">Disetujui</span>
                      ) : (
                        <span className="badge badge-yellow">Menunggu</span>
                      )}
                    </td>
                    <td style={{ fontSize: 11, color: "var(--text-muted)" }}>{timeAgo(user.createdAt)}</td>
                    {isSuperAdmin(session?.user?.role) && (
                      <td>
                        {user.role !== "SUPER_ADMIN" && (
                          <UserActions
                            userId={user.id}
                            userEmail={user.email}
                            currentRole={user.role}
                            accountApproved={user.accountApproved}
                          />
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
