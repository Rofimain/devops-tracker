"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { COST_CATEGORIES, presetsForCategory, type CostCategory } from "@/lib/project-cost-catalog";
import {
  emptyCostLineItem,
  formatUsd,
  lineItemFromPreset,
  lineItemSubtotal,
  parseCostLineItems,
  sumCostItems,
  type ProjectCostLineItem,
} from "@/lib/project-cost";

type InfraCostState = {
  envName: string;
  costItems: ProjectCostLineItem[];
  costNotes: string;
};

function mapInfrasToCostState(infras: any[]): InfraCostState[] {
  return (infras ?? []).map((inf) => ({
    envName: inf.envName,
    costItems: parseCostLineItems(inf.costItems),
    costNotes: inf.costNotes ?? "",
  }));
}

export function ProjectCostTab({
  projectId,
  infras,
  canWrite = true,
}: {
  projectId: string;
  infras: any[];
  canWrite?: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<InfraCostState[]>(() => mapInfrasToCostState(infras));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const grandTotal = useMemo(() => rows.reduce((s, r) => s + sumCostItems(r.costItems), 0), [rows]);

  const updateRow = (envName: string, patch: Partial<InfraCostState>) => {
    setRows((prev) => prev.map((r) => (r.envName === envName ? { ...r, ...patch } : r)));
    setSaved(false);
  };

  const addLineItem = (envName: string, category: CostCategory) => {
    const presets = presetsForCategory(category);
    const preset = presets[0];
    const item = preset ? lineItemFromPreset(preset.id, 1) : emptyCostLineItem();
    if (!item) return;
    updateRow(envName, {
      costItems: [...(rows.find((r) => r.envName === envName)?.costItems ?? []), item],
    });
  };

  const updateLineItem = (envName: string, index: number, patch: Partial<ProjectCostLineItem>) => {
    const row = rows.find((r) => r.envName === envName);
    if (!row) return;
    const next = row.costItems.map((item, i) => (i === index ? { ...item, ...patch } : item));
    updateRow(envName, { costItems: next });
  };

  const applyPreset = (envName: string, index: number, presetId: string) => {
    const item = lineItemFromPreset(presetId, rows.find((r) => r.envName === envName)?.costItems[index]?.quantity ?? 1);
    if (!item) return;
    const row = rows.find((r) => r.envName === envName);
    if (!row) return;
    const next = row.costItems.map((line, i) => (i === index ? item : line));
    updateRow(envName, { costItems: next });
  };

  const removeLineItem = (envName: string, index: number) => {
    const row = rows.find((r) => r.envName === envName);
    if (!row) return;
    updateRow(envName, { costItems: row.costItems.filter((_, i) => i !== index) });
  };

  const handleSave = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/costs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          costs: rows.map((r) => ({
            envName: r.envName,
            costItems: r.costItems,
            costNotes: r.costNotes || null,
          })),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Gagal menyimpan");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  if (rows.length === 0) {
    return (
      <div className="card">
        <div className="card-body" style={{ color: "var(--text-muted)", fontSize: 13 }}>
          Belum ada environment. Tambahkan environment di tab Infrastruktur atau edit project.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="card" style={{ borderColor: "var(--accent)", background: "var(--bg-subtle)" }}>
        <div className="card-body" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Total estimasi semua environment</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>{formatUsd(grandTotal)}<span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)" }}>/bulan</span></div>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", maxWidth: 360, lineHeight: 1.45 }}>
            Estimasi berdasarkan harga publik AWS (on-demand), Cloudflare, GitHub/GitLab. Aktual dapat berbeda per region, reserved instance, dan penggunaan.
          </div>
        </div>
      </div>

      {error && <div className="alert-warning" style={{ background: "var(--red-bg)", borderColor: "var(--red)", color: "var(--red-text)" }}>{error}</div>}
      {saved && <div className="alert-info" style={{ fontSize: 12 }}>Biaya tersimpan. Ringkasan Cost / Month di overview ikut terupdate.</div>}

      {rows.map((row) => {
        const envTotal = sumCostItems(row.costItems);
        return (
          <div key={row.envName} className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <span className="card-title" style={{ textTransform: "capitalize" }}>
                Environment: {row.envName}
              </span>
              <span className="badge badge-blue">{formatUsd(envTotal)}/mo</span>
            </div>
            <div className="card-body" style={{ paddingTop: 0 }}>
              {row.costItems.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>Belum ada item biaya untuk environment ini.</div>
              ) : (
                <div className="table-wrap" style={{ marginBottom: 12 }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Kategori</th>
                        <th>Layanan</th>
                        <th style={{ width: 72 }}>Qty</th>
                        <th style={{ width: 110 }}>Harga/unit</th>
                        <th style={{ width: 100 }}>Subtotal</th>
                        {canWrite ? <th style={{ width: 48 }} /> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {row.costItems.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            {canWrite ? (
                              <select
                                className="form-select"
                                style={{ fontSize: 11, padding: "4px 8px" }}
                                value={item.category}
                                onChange={(e) => {
                                  const cat = e.target.value as CostCategory;
                                  const first = presetsForCategory(cat)[0];
                                  if (first) applyPreset(row.envName, idx, first.id);
                                  else updateLineItem(row.envName, idx, { category: cat, presetId: "custom" });
                                }}
                              >
                                {COST_CATEGORIES.map((c) => (
                                  <option key={c.id} value={c.id}>{c.label}</option>
                                ))}
                              </select>
                            ) : (
                              <span style={{ fontSize: 11 }}>{COST_CATEGORIES.find((c) => c.id === item.category)?.label ?? item.category}</span>
                            )}
                          </td>
                          <td>
                            {canWrite ? (
                              <select
                                className="form-select"
                                style={{ fontSize: 11, padding: "4px 8px", minWidth: 200 }}
                                value={item.presetId}
                                onChange={(e) => {
                                  if (e.target.value === "custom") {
                                    updateLineItem(row.envName, idx, { presetId: "custom" });
                                  } else {
                                    applyPreset(row.envName, idx, e.target.value);
                                  }
                                }}
                              >
                                {presetsForCategory(item.category as CostCategory).map((p) => (
                                  <option key={p.id} value={p.id}>{p.provider} — {p.label} ({formatUsd(p.monthlyUsd)})</option>
                                ))}
                                <option value="custom">Custom / lainnya</option>
                              </select>
                            ) : (
                              <span style={{ fontSize: 11 }}>{item.provider} — {item.label}</span>
                            )}
                            {item.presetId === "custom" && canWrite && (
                              <input
                                className="form-input"
                                style={{ marginTop: 6, fontSize: 11, padding: "4px 8px" }}
                                value={item.label}
                                onChange={(e) => updateLineItem(row.envName, idx, { label: e.target.value })}
                                placeholder="Nama item"
                              />
                            )}
                          </td>
                          <td>
                            {canWrite ? (
                              <input
                                className="form-input"
                                type="number"
                                min={0}
                                step={1}
                                style={{ fontSize: 11, padding: "4px 8px" }}
                                value={item.quantity}
                                onChange={(e) => updateLineItem(row.envName, idx, { quantity: Math.max(0, Number(e.target.value) || 0) })}
                              />
                            ) : (
                              item.quantity
                            )}
                          </td>
                          <td>
                            {canWrite && item.presetId === "custom" ? (
                              <input
                                className="form-input"
                                type="number"
                                min={0}
                                step={0.01}
                                style={{ fontSize: 11, padding: "4px 8px" }}
                                value={item.monthlyUsd}
                                onChange={(e) => updateLineItem(row.envName, idx, { monthlyUsd: Math.max(0, Number(e.target.value) || 0) })}
                              />
                            ) : (
                              formatUsd(item.monthlyUsd)
                            )}
                          </td>
                          <td style={{ fontWeight: 600, fontSize: 12 }}>{formatUsd(lineItemSubtotal(item))}</td>
                          {canWrite ? (
                            <td>
                              <button type="button" className="btn btn-sm" style={{ fontSize: 10, color: "var(--red)" }} onClick={() => removeLineItem(row.envName, idx)}>
                                Hapus
                              </button>
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {canWrite && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  {COST_CATEGORIES.filter((c) => c.id !== "other").map((cat) => (
                    <button key={cat.id} type="button" className="btn btn-sm" onClick={() => addLineItem(row.envName, cat.id)}>
                      + {cat.label.split(" (")[0]}
                    </button>
                  ))}
                  <button type="button" className="btn btn-sm" onClick={() => updateRow(row.envName, { costItems: [...row.costItems, emptyCostLineItem()] })}>
                    + Custom
                  </button>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Catatan biaya ({row.envName})</label>
                {canWrite ? (
                  <textarea
                    className="form-textarea"
                    style={{ minHeight: 64, fontSize: 12 }}
                    value={row.costNotes}
                    onChange={(e) => updateRow(row.envName, { costNotes: e.target.value })}
                    placeholder="Mis. reserved instance 1 tahun, shared dengan project lain..."
                  />
                ) : (
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "pre-wrap" }}>{row.costNotes || "—"}</div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {canWrite && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-primary" disabled={loading} onClick={handleSave}>
            {loading ? "Menyimpan..." : "Simpan Biaya"}
          </button>
        </div>
      )}
    </div>
  );
}
