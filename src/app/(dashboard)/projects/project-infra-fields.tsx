"use client";

import { useState } from "react";
import { CommaSeparatedInput } from "@/components/comma-separated-input";
import { InfraFormRow, PRESET_ENVIRONMENTS, emptyInfraRow, orderInfraRows } from "@/lib/project-infra";

function togglePreset(rows: InfraFormRow[], env: string, enabled: boolean): InfraFormRow[] {
  const key = env.toLowerCase();
  const has = rows.some((r) => r.envName.toLowerCase() === key);
  if (enabled && !has) {
    return orderInfraRows([...rows, emptyInfraRow(env)]);
  }
  if (!enabled && has) {
    return rows.filter((r) => r.envName.toLowerCase() !== key);
  }
  return rows;
}

function updateRow(rows: InfraFormRow[], envName: string, patch: Partial<InfraFormRow>): InfraFormRow[] {
  return rows.map((r) => (r.envName.toLowerCase() === envName.toLowerCase() ? { ...r, ...patch, envName: r.envName } : r));
}

export function ProjectInfraFields({
  infras,
  onChange,
}: {
  infras: InfraFormRow[];
  onChange: (next: InfraFormRow[]) => void;
}) {
  const [customDraft, setCustomDraft] = useState("");
  const [hint, setHint] = useState("");

  const ordered = orderInfraRows(infras);

  const presetChecked = (preset: string) => ordered.some((r) => r.envName.toLowerCase() === preset.toLowerCase());

  const setPreset = (preset: string, on: boolean) => {
    setHint("");
    onChange(togglePreset(ordered, preset, on));
  };

  const addCustomEnv = () => {
    const t = customDraft.trim();
    if (!t) {
      setHint("Isi nama environment.");
      return;
    }
    if (ordered.some((r) => r.envName.toLowerCase() === t.toLowerCase())) {
      setHint("Environment ini sudah ada.");
      return;
    }
    onChange(orderInfraRows([...ordered, emptyInfraRow(t)]));
    setCustomDraft("");
    setHint("");
  };

  const handleArray = (envName: string, key: "hosting" | "cdn" | "databases", items: string[]) => {
    onChange(updateRow(ordered, envName, { [key]: items }));
  };

  return (
    <>
      <div className="project-form-env-toolbar">
        <div className="form-group" style={{ margin: 0, paddingBottom: 12 }}>
          <label className="form-label">Environment</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 10 }}>
            {PRESET_ENVIRONMENTS.map((env) => (
              <label
                key={env}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                  fontSize: 12,
                  padding: "4px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: presetChecked(env) ? "var(--accent-muted)" : "var(--bg-subtle)",
                }}
              >
                <input type="checkbox" checked={presetChecked(env)} onChange={(e) => setPreset(env, e.target.checked)} />
                <span style={{ textTransform: "capitalize", fontWeight: presetChecked(env) ? 600 : 400 }}>{env}</span>
              </label>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "stretch", flexWrap: "wrap" }}>
            <input
              className="form-input"
              style={{ flex: "1 1 200px", marginBottom: 0 }}
              value={customDraft}
              onChange={(e) => {
                setCustomDraft(e.target.value);
                setHint("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomEnv();
                }
              }}
              placeholder="Environment lain (mis. uat, dr)"
            />
            <button type="button" className="btn btn-sm" onClick={addCustomEnv}>
              Tambah
            </button>
          </div>
          {hint ? <div style={{ fontSize: 11, color: "var(--yellow)", marginTop: 6 }}>{hint}</div> : null}
        </div>
      </div>

      {ordered.length === 0 ? (
        <div className="card-body">
          <div className="alert-warning" style={{ fontSize: 12, margin: 0 }}>
            Pilih minimal satu environment.
          </div>
        </div>
      ) : (
        <div className="project-env-grid">
          {ordered.map((row) => (
            <div key={row.envName} className="project-env-card">
              <div className="project-env-card-head">
                <span style={{ textTransform: "capitalize" }}>{row.envName}</span>
              </div>
              <div className="project-env-card-body" style={{ gridTemplateColumns: "1fr" }}>
                <div className="form-group">
                  <label className="form-label">URL</label>
                  <input
                    className="form-input"
                    value={row.url}
                    onChange={(e) => onChange(updateRow(ordered, row.envName, { url: e.target.value }))}
                    placeholder={
                      row.envName.toLowerCase() === "production"
                        ? "https://portal.company.com"
                        : `https://${row.envName}.company.com`
                    }
                  />
                </div>
              </div>
              <div className="project-env-card-body">
                <div className="form-group">
                  <label className="form-label">Target Group</label>
                  <input
                    className="form-input mono"
                    value={row.targetGroup}
                    onChange={(e) => onChange(updateRow(ordered, row.envName, { targetGroup: e.target.value }))}
                    placeholder="portal-tg-prod"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Load Balancer</label>
                  <input
                    className="form-input mono"
                    value={row.loadBalancer}
                    onChange={(e) => onChange(updateRow(ordered, row.envName, { loadBalancer: e.target.value }))}
                    placeholder="ALB-portal-prod"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Server IP</label>
                  <input
                    className="form-input mono"
                    value={row.serverIp}
                    onChange={(e) => onChange(updateRow(ordered, row.envName, { serverIp: e.target.value }))}
                    placeholder="10.0.1.45"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Hosting</label>
                  <CommaSeparatedInput
                    value={row.hosting}
                    onChange={(items) => handleArray(row.envName, "hosting", items)}
                    placeholder="ECS, AWS EC2"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">CDN / Proxy</label>
                  <CommaSeparatedInput
                    value={row.cdn}
                    onChange={(items) => handleArray(row.envName, "cdn", items)}
                    placeholder="Cloudflare"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Database</label>
                  <CommaSeparatedInput
                    value={row.databases}
                    onChange={(items) => handleArray(row.envName, "databases", items)}
                    placeholder="MySQL, Redis"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
