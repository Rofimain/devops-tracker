import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { canWriteWebDecommissioned } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/topbar";
import { Archive, Plus, Search } from "lucide-react";
import {
  FINAL_STATUS_OPTIONS,
  PROCESS_STATUS_OPTIONS,
  formatDateDisplay,
  labelForOption,
} from "@/lib/web-decommissioned";
import { WebDecommissionRowActions } from "./web-decommission-row-actions";

export default async function WebDecommissionedListPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; final?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const canWrite = canWriteWebDecommissioned(session.user.role);

  const q = searchParams.q?.trim() ?? "";
  const status = searchParams.status?.trim() ?? "";
  const final = searchParams.final?.trim() ?? "";

  const records = await prisma.webDecommissionRecord.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { platformName: { contains: q, mode: "insensitive" } },
                { domainUrl: { contains: q, mode: "insensitive" } },
                { ownerRequester: { contains: q, mode: "insensitive" } },
                { systemOwnerTeam: { contains: q, mode: "insensitive" } },
                { picInfra: { contains: q, mode: "insensitive" } },
              ],
            }
          : {},
        status
          ? { processStatus: status as (typeof PROCESS_STATUS_OPTIONS)[number]["value"] }
          : {},
        final ? { finalStatus: final as (typeof FINAL_STATUS_OPTIONS)[number]["value"] } : {},
      ],
    },
    orderBy: [{ createdAt: "desc" }],
    include: {
      evidences: { select: { id: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  return (
    <>
      <Topbar
        title="Web Decommissioned"
        breadcrumb="Audit"
        breadcrumbHref="/audit"
        action={
          canWrite ? (
            <Link href="/audit/web-decommissioned/new" className="btn btn-primary">
              <Plus size={13} /> Dokumentasi baru
            </Link>
          ) : undefined
        }
      />
      <div className="app-content">
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--text-muted)", maxWidth: 720 }}>
          Dokumentasi internal untuk web yang dihapus, inactive, decommissioned, atau diarsipkan —
          termasuk request channel, approval infra, scope, status proses, dan multi bukti screenshot.
        </p>

        {!canWrite && (
          <div className="wd-readonly-banner">
            Akun Anda (<strong>{session.user.role?.replace("_", " ") ?? "Unknown"}</strong>) hanya bisa melihat.
            Edit / hapus membutuhkan role Admin atau Super Admin.
          </div>
        )}

        <form className="wd-filters" method="get">
          <div className="search-bar">
            <Search size={13} style={{ color: "var(--text-muted)" }} />
            <input name="q" placeholder="Cari platform, domain, PIC…" defaultValue={q} />
          </div>
          <select name="status" defaultValue={status} className="wd-filter-select">
            <option value="">Semua status proses</option>
            {PROCESS_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select name="final" defaultValue={final} className="wd-filter-select">
            <option value="">Semua status akhir</option>
            {FINAL_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-sm">
            Filter
          </button>
        </form>

        <div className="card">
          {records.length === 0 ? (
            <div className="empty-state" style={{ padding: "48px 0" }}>
              <Archive size={32} />
              <div>Belum ada dokumentasi web decommissioned.</div>
              {canWrite ? (
                <Link href="/audit/web-decommissioned/new" className="btn btn-primary btn-sm">
                  Buat dokumentasi pertama
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 44 }}>No</th>
                    <th>Platform</th>
                    <th>Domain / URL</th>
                    <th>Owner</th>
                    <th>Status Proses</th>
                    <th>Status Akhir</th>
                    <th>Selesai</th>
                    <th>Bukti</th>
                    <th>PIC Infra</th>
                    <th style={{ width: 160 }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((row, i) => (
                    <tr key={row.id}>
                      <td style={{ color: "var(--text-muted)" }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>
                        <Link
                          href={`/audit/web-decommissioned/${row.id}`}
                          style={{ color: "var(--text-primary)", textDecoration: "none" }}
                        >
                          {row.platformName}
                        </Link>
                      </td>
                      <td style={{ fontSize: 12, maxWidth: 220 }}>
                        <a
                          href={row.domainUrl.startsWith("http") ? row.domainUrl : `https://${row.domainUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "var(--accent)" }}
                        >
                          {row.domainUrl}
                        </a>
                      </td>
                      <td style={{ fontSize: 12 }}>{row.ownerRequester}</td>
                      <td>
                        <span className="badge badge-blue" style={{ fontSize: 10 }}>
                          {labelForOption(PROCESS_STATUS_OPTIONS, row.processStatus)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            row.finalStatus === "CLOSED"
                              ? "badge-green"
                              : row.finalStatus === "REJECTED"
                                ? "badge-red"
                                : "badge-yellow"
                          }`}
                          style={{ fontSize: 10 }}
                        >
                          {labelForOption(FINAL_STATUS_OPTIONS, row.finalStatus)}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                        {formatDateDisplay(row.completedAt)}
                      </td>
                      <td style={{ fontSize: 12 }}>{row.evidences.length}</td>
                      <td style={{ fontSize: 12 }}>{row.picInfra || "—"}</td>
                      <td>
                        <WebDecommissionRowActions
                          id={row.id}
                          platformName={row.platformName}
                          canWrite={canWrite}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
