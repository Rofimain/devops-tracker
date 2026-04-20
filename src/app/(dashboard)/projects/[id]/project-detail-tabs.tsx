"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { TOOL_CATEGORY_COLORS, timeAgo, statusBadgeClass, statusLabel, webBasedBadgeClass } from "@/lib/utils";
import { FileText, Plus, ExternalLink } from "lucide-react";

export function ProjectDetailTabs({ project, canWrite = true }: { project: any; canWrite?: boolean }) {
  const [tab, setTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "infra", label: "Infrastruktur" },
    { id: "tools", label: `Tools (${project.tools?.length ?? 0})` },
    { id: "docs", label: `Dokumentasi (${project.docs?.length ?? 0})` },
    { id: "activity", label: "Activity Log" },
  ];

  return (
    <>
      <div className="tabs">
        {tabs.map((t) => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === "overview" && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header"><span className="card-title">Info Project</span></div>
            <div className="info-row"><span className="info-label">Site Name</span><span className="info-value">{project.name}</span></div>
            <div className="info-row"><span className="info-label">URL</span><span className="info-value" style={{ color: "var(--accent)" }}>{project.url || "—"}</span></div>
            <div className="info-row"><span className="info-label">Category</span><span className="info-value">{project.category ? <span className="badge badge-blue">{project.category}</span> : "—"}</span></div>
            <div className="info-row"><span className="info-label">Management</span><span className="info-value">{project.management || "—"}</span></div>
            <div className="info-row">
              <span className="info-label">Status</span>
              <span className="info-value">
                <span className={`badge ${statusBadgeClass(project.status)}`}>{statusLabel(project.status)}</span>
              </span>
            </div>
            <div className="info-row"><span className="info-label">Platform</span><span className="info-value">{(project.platform ?? []).map((t: string, i: number) => <span key={i} className="tag">{t}</span>)}</span></div>
            <div className="info-row"><span className="info-label">Repository</span><span className="info-value" style={{ color: "var(--accent)" }}>{project.repoUrl || "—"}</span></div>
            <div className="info-row">
              <span className="info-label">Cost / Month</span>
              <span className="info-value">{project.costPerMonth?.trim() ? project.costPerMonth : "—"}</span>
            </div>
            {project.notes && <div className="info-row"><span className="info-label">Notes</span><span className="info-value" style={{ whiteSpace: "pre-wrap", fontSize: 11 }}>{project.notes}</span></div>}
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">Infrastruktur Summary</span></div>
            <div className="info-row">
              <span className="info-label">Web App</span>
              <span className="info-value">
                <span className={`badge ${webBasedBadgeClass(project.webBasedApp)}`}>{project.webBasedApp}</span>
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Environment</span>
              <span className="info-value" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {(project.infras ?? []).length === 0 ? (
                  "—"
                ) : (
                  (project.infras ?? []).map((inf: { envName: string }, i: number) => (
                    <span key={i} className="badge badge-blue" style={{ textTransform: "capitalize" }}>
                      {inf.envName}
                    </span>
                  ))
                )}
              </span>
            </div>
            {(project.infras ?? []).map((inf: any) => (
              <div key={inf.id ?? inf.envName} style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: "capitalize" }}>{inf.envName}</div>
                <div className="info-row"><span className="info-label">Target Group</span><span className="info-value mono">{inf.targetGroup || "—"}</span></div>
                <div className="info-row"><span className="info-label">Load Balancer</span><span className="info-value mono">{inf.loadBalancer || "—"}</span></div>
                <div className="info-row"><span className="info-label">Server IP</span><span className="info-value mono">{inf.serverIp || "—"}</span></div>
                <div className="info-row"><span className="info-label">Hosting</span><span className="info-value">{(inf.hosting ?? []).map((h: string, i: number) => <span key={i} className="tag">{h}</span>)}</span></div>
                <div className="info-row"><span className="info-label">CDN</span><span className="info-value">{(inf.cdn ?? []).map((c: string, i: number) => <span key={i} className="tag">{c}</span>)}</span></div>
                <div className="info-row"><span className="info-label">Database</span><span className="info-value">{(inf.databases ?? []).map((d: string, i: number) => <span key={i} className="tag">{d}</span>)}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* INFRA */}
      {tab === "infra" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {(project.infras ?? []).length === 0 ? (
            <div className="card"><div className="card-body" style={{ color: "var(--text-muted)" }}>Belum ada data infrastruktur per environment.</div></div>
          ) : (
            (project.infras ?? []).map((inf: any) => (
              <div key={inf.id} className="card">
                <div className="card-header">
                  <span className="card-title" style={{ textTransform: "capitalize" }}>Environment: {inf.envName}</span>
                </div>
                <div className="card-body" style={{ paddingTop: 0 }}>
                  <div className="grid-2">
                    <div>
                      <div className="sec-label">Compute</div>
                      <div className="cfg-block">
                        <div className="cfg-block-title">Hosting / Server</div>
                        <div className="cfg-grid">
                          <span className="cfg-label">Provider</span><span className="cfg-value">{(inf.hosting ?? []).join(", ") || "—"}</span>
                          <span className="cfg-label">IP Address</span><span className="cfg-value">{inf.serverIp || "—"}</span>
                        </div>
                      </div>
                      <div className="sec-label" style={{ marginTop: 12 }}>Load Balancer</div>
                      <div className="cfg-block">
                        <div className="cfg-block-title">{inf.loadBalancer || "Not configured"}</div>
                        <div className="cfg-grid">
                          <span className="cfg-label">Name</span><span className="cfg-value">{inf.loadBalancer || "—"}</span>
                          <span className="cfg-label">Target Group</span><span className="cfg-value">{inf.targetGroup || "—"}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="sec-label">Database</div>
                      <div className="cfg-block">
                        <div className="cfg-block-title">Database(s)</div>
                        <div className="cfg-grid">
                          {(inf.databases ?? []).map((d: string, i: number) => (
                            <Fragment key={`db${i}`}>
                              <span className="cfg-label">DB {i + 1}</span>
                              <span className="cfg-value">{d}</span>
                            </Fragment>
                          ))}
                          {(inf.databases ?? []).length === 0 && (
                            <>
                              <span className="cfg-label">—</span>
                              <span className="cfg-value">Not configured</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="sec-label" style={{ marginTop: 12 }}>CDN / DNS</div>
                      <div className="cfg-block">
                        <div className="cfg-block-title">CDN / Proxy</div>
                        <div className="cfg-grid">
                          {(inf.cdn ?? []).map((c: string, i: number) => (
                            <Fragment key={`cdn${i}`}>
                              <span className="cfg-label">CDN {i + 1}</span>
                              <span className="cfg-value">{c}</span>
                            </Fragment>
                          ))}
                          {(inf.cdn ?? []).length === 0 && (
                            <>
                              <span className="cfg-label">—</span>
                              <span className="cfg-value">Not configured</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TOOLS */}
      {tab === "tools" && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Tools yang Digunakan</span>
            {canWrite ? (
              <Link href={`/projects/${project.slug}/tools/add`} className="btn btn-primary btn-sm"><Plus size={12} /> Add Tool</Link>
            ) : null}
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tool</th>
                  <th>Category</th>
                  <th>Version</th>
                  <th>Config Notes</th>
                  <th>Docs</th>
                  {canWrite ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {project.tools.length === 0 ? (
                  <tr>
                    <td colSpan={canWrite ? 6 : 5} style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)" }}>
                      Belum ada tool.{canWrite ? <> <Link href={`/projects/${project.slug}/tools/add`} style={{ color: "var(--accent)" }}>Tambah tool →</Link></> : null}
                    </td>
                  </tr>
                ) : (
                  project.tools.map((pt: any) => (
                    <tr key={pt.id}>
                      <td style={{ fontWeight: 600 }}>{pt.tool.name}</td>
                      <td><span className={`badge ${TOOL_CATEGORY_COLORS[pt.tool.category] ?? "badge-gray"}`}>{pt.tool.category}</span></td>
                      <td className="mono">{pt.version || pt.tool.version || "—"}</td>
                      <td style={{ fontSize: 11, color: "var(--text-muted)", maxWidth: 220, whiteSpace: "normal" }}>{pt.notes || "—"}</td>
                      <td>
                        {pt.tool.docsUrl ? <a href={pt.tool.docsUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}>docs <ExternalLink size={10} /></a> : "—"}
                      </td>
                      {canWrite ? (
                        <td>
                          <button className="btn btn-sm" style={{ fontSize: 10 }} onClick={() => { if (confirm("Hapus tool ini?")) fetch(`/api/projects/${project.id}/tools/${pt.id}`, { method: "DELETE" }).then(() => window.location.reload()); }}>Hapus</button>
                        </td>
                      ) : null}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DOCS */}
      {tab === "docs" && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Dokumentasi Project</span>
            {canWrite ? (
              <Link href={`/docs/new?projectId=${project.id}`} className="btn btn-primary btn-sm"><Plus size={12} /> New Doc</Link>
            ) : null}
          </div>
          {project.docs.length === 0 ? (
            <div className="empty-state">
              <FileText size={32} />
              <div>Belum ada dokumentasi.</div>
              {canWrite ? <Link href={`/docs/new?projectId=${project.id}`} className="btn btn-primary btn-sm">Tambah Dok</Link> : null}
            </div>
          ) : (
            project.docs.map((doc: any) => (
              <Link key={doc.id} href={`/docs/${doc.id}`} className="doc-item" style={{ display: "flex", textDecoration: "none" }}>
                <div className="doc-icon"><FileText size={14} style={{ color: "var(--text-muted)" }} /></div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 12, color: "var(--text-primary)" }}>{doc.title}</div>
                  <div style={{ marginTop: 3 }}>
                    {doc.tags.map((t: string, i: number) => <span key={i} className="tag">{t}</span>)}
                    <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 6 }}>Updated {timeAgo(doc.updatedAt)}</span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {/* ACTIVITY */}
      {tab === "activity" && (
        <div className="card">
          <div className="card-header"><span className="card-title">Activity Log</span></div>
          <div className="card-body">
            {project.activities.length === 0 ? (
              <div className="empty-state">Belum ada aktivitas.</div>
            ) : (
              project.activities.map((a: any) => (
                <div key={a.id} className="activity-item">
                  <div className="activity-dot" />
                  <div>
                    <div style={{ fontSize: 12, color: "var(--text-primary)" }}>{a.details || a.action}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{a.user?.name ?? "System"} · {timeAgo(a.createdAt)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
