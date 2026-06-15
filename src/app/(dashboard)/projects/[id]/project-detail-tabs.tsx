"use client";

import { Fragment, useState, type ReactNode } from "react";
import Link from "next/link";
import { TOOL_CATEGORY_COLORS, timeAgo, webBasedBadgeClass } from "@/lib/utils";
import { displayExternalUrl, displayRepoUrl, normalizeExternalUrl } from "@/lib/external-url";
import { envUrlLabel, resolveInfraUrl } from "@/lib/project-env-url";
import { formatUsd, parseCostLineItems, sumCostItems } from "@/lib/project-cost";
import { FileText, Plus, ExternalLink } from "lucide-react";
import { ProjectCostTab } from "./project-cost-tab";

function DlRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="project-dl-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function EnvKv({ label, value }: { label: string; value: ReactNode }) {
  if (value == null || value === "" || value === "—") return null;
  return (
    <div className="project-env-kv">
      <div className="project-env-kv-label">{label}</div>
      <div className="project-env-kv-value">{value}</div>
    </div>
  );
}

function tagList(items: string[]) {
  if (!items.length) return null;
  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 4 }}>
      {items.map((t, i) => (
        <span key={i} className="tag">
          {t}
        </span>
      ))}
    </span>
  );
}

export function ProjectDetailTabs({ project, canWrite = true }: { project: any; canWrite?: boolean }) {
  const [tab, setTab] = useState("overview");

  const costTotal = (project.infras ?? []).reduce(
    (sum: number, inf: any) => sum + sumCostItems(parseCostLineItems(inf.costItems)),
    0
  );

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "infra", label: "Infrastruktur" },
    { id: "cost", label: costTotal > 0 ? `Cost / Month (${formatUsd(costTotal)})` : "Cost / Month" },
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
        <div className="project-overview-grid">
          <div className="card">
            <div className="card-header">
              <span className="card-title">Info Project</span>
            </div>
            <dl className="project-dl">
              <DlRow label="Site Name">{project.name}</DlRow>
              {(project.infras ?? []).length > 0
                ? (project.infras ?? []).map((inf: any) => {
                    const href = resolveInfraUrl(inf.envName, inf.url, project.url);
                    if (!href) return null;
                    return (
                      <DlRow key={inf.id ?? inf.envName} label={envUrlLabel(inf.envName)}>
                        <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
                          {displayExternalUrl(href)}
                        </a>
                      </DlRow>
                    );
                  })
                : project.url ? (
                    <DlRow label="URL (Production)">
                      <a
                        href={normalizeExternalUrl(project.url)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "var(--accent)" }}
                      >
                        {displayExternalUrl(project.url)}
                      </a>
                    </DlRow>
                  ) : null}
              {project.category ? (
                <DlRow label="Category">
                  <span className="badge badge-blue">{project.category}</span>
                </DlRow>
              ) : null}
              {project.management?.trim() ? <DlRow label="Management">{project.management}</DlRow> : null}
              {(project.platform ?? []).length > 0 ? (
                <DlRow label="Platform">{tagList(project.platform)}</DlRow>
              ) : null}
              {project.repoUrl ? (
                <DlRow label="Repository">
                  <a
                    href={normalizeExternalUrl(project.repoUrl)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--accent)" }}
                  >
                    {displayRepoUrl(project.repoUrl)}
                  </a>
                </DlRow>
              ) : null}
              {costTotal > 0 || project.costPerMonth?.trim() ? (
                <DlRow label="Cost / Month">
                  {costTotal > 0 ? (
                    <strong>{formatUsd(costTotal)}/mo</strong>
                  ) : (
                    project.costPerMonth
                  )}
                </DlRow>
              ) : null}
              {project.notes?.trim() ? (
                <DlRow label="Notes">
                  <span style={{ whiteSpace: "pre-wrap", fontSize: 11, fontWeight: 400, color: "var(--text-secondary)" }}>
                    {project.notes}
                  </span>
                </DlRow>
              ) : null}
            </dl>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Infrastruktur Summary</span>
              <span className={`badge ${webBasedBadgeClass(project.webBasedApp)}`}>{project.webBasedApp}</span>
            </div>
            {(project.infras ?? []).length === 0 ? (
              <div className="card-body" style={{ color: "var(--text-muted)", fontSize: 12 }}>
                Belum ada data infrastruktur per environment.
              </div>
            ) : (
              <div className="project-env-grid">
                {(project.infras ?? []).map((inf: any) => (
                  <div key={inf.id ?? inf.envName} className="project-env-card">
                    <div className="project-env-card-head">
                      <span>{inf.envName}</span>
                      {(inf.hosting ?? []).length > 0 ? (
                        <span className="badge badge-gray" style={{ fontSize: 9 }}>
                          {(inf.hosting ?? [])[0]}
                        </span>
                      ) : null}
                    </div>
                    <div className="project-env-card-body">
                      <EnvKv label="Target Group" value={inf.targetGroup || null} />
                      <EnvKv label="Load Balancer" value={inf.loadBalancer || null} />
                      <EnvKv label="Server IP" value={inf.serverIp || null} />
                      <EnvKv label="Hosting" value={tagList(inf.hosting ?? [])} />
                      <EnvKv label="CDN" value={tagList(inf.cdn ?? [])} />
                      <EnvKv label="Database" value={tagList(inf.databases ?? [])} />
                    </div>
                  </div>
                ))}
              </div>
            )}
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

      {/* COST */}
      {tab === "cost" && (
        <ProjectCostTab projectId={project.id} infras={project.infras ?? []} canWrite={canWrite} />
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
                  <div style={{ fontWeight: 600, fontSize: 12, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                    {doc.title}
                    {doc.contentType === "PDF" && <span className="badge badge-gray" style={{ fontSize: 9 }}>PDF</span>}
                    {doc.contentType === "DOCX" && <span className="badge badge-gray" style={{ fontSize: 9 }}>Word</span>}
                  </div>
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
