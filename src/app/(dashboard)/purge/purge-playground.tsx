"use client";

import { useCallback, useEffect, useState } from "react";
import { Cloud, Loader2, Play, Plus, Save, Settings2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Preset = { id: string; name: string; bodyJson: string; sortOrder: number };

const DEFAULT_BODY = `{
  "hosts": [
    "staging.example.com"
  ]
}`;

export function PurgePlayground({
  initialZoneId,
  initialHasToken,
  initialPresets,
  canConfigure,
}: {
  initialZoneId: string;
  initialHasToken: boolean;
  initialPresets: Preset[];
  canConfigure: boolean;
}) {
  const [tab, setTab] = useState<"request" | "config">("request");
  const [presets, setPresets] = useState<Preset[]>(initialPresets);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [bodyJson, setBodyJson] = useState(DEFAULT_BODY);
  const [responseText, setResponseText] = useState("");
  const [respTab, setRespTab] = useState<"body" | "response">("body");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");

  const [zoneId, setZoneId] = useState(initialZoneId);
  const [apiToken, setApiToken] = useState("");
  const [hasToken, setHasToken] = useState(initialHasToken);
  const [savingCfg, setSavingCfg] = useState(false);

  const [newPresetName, setNewPresetName] = useState("");
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null);

  const zid = (zoneId || initialZoneId).trim();
  const endpoint = zid
    ? `https://api.cloudflare.com/client/v4/zones/${zid}/purge_cache`
    : "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache";

  const reloadPresets = useCallback(async () => {
    const r = await fetch("/api/purge-presets");
    if (r.ok) setPresets(await r.json());
  }, []);

  useEffect(() => {
    setPresets(initialPresets);
  }, [initialPresets]);

  const sendPurge = async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(bodyJson);
    } catch {
      setErr("JSON body tidak valid.");
      return;
    }
    setSending(true);
    setErr("");
    setResponseText("");
    setRespTab("response");
    try {
      const res = await fetch("/api/cloudflare/purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (data.body) {
        setResponseText(data.body);
      } else {
        setResponseText(JSON.stringify(data, null, 2));
      }
      if (!res.ok) {
        setErr(data.message || data.error || "Permintaan gagal");
      }
    } catch (e: any) {
      setErr(e.message || "Jaringan error");
    } finally {
      setSending(false);
    }
  };

  const saveConfig = async () => {
    setSavingCfg(true);
    setErr("");
    try {
      const res = await fetch("/api/settings/cloudflare", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zoneId: zoneId.trim(), apiToken: apiToken.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Gagal menyimpan");
        return;
      }
      setHasToken(data.hasToken);
      setApiToken("");
    } catch {
      setErr("Gagal menyimpan");
    } finally {
      setSavingCfg(false);
    }
  };

  const selectPreset = (p: Preset) => {
    setActivePresetId(p.id);
    setBodyJson(p.bodyJson);
    setRespTab("body");
  };

  const addPreset = async () => {
    if (!newPresetName.trim()) return;
    setErr("");
    try {
      const res = await fetch("/api/purge-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPresetName.trim(), bodyJson }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Gagal menambah preset");
        return;
      }
      setNewPresetName("");
      await reloadPresets();
      setActivePresetId(data.id);
    } catch {
      setErr("Gagal menambah preset");
    }
  };

  const deletePreset = async (id: string) => {
    if (!confirm("Hapus preset ini?")) return;
    await fetch(`/api/purge-presets/${id}`, { method: "DELETE" });
    if (activePresetId === id) setActivePresetId(null);
    await reloadPresets();
  };

  const savePresetEdit = async () => {
    if (!editingPreset) return;
    const res = await fetch(`/api/purge-presets/${editingPreset.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingPreset.name, bodyJson: editingPreset.bodyJson }),
    });
    if (res.ok) {
      setEditingPreset(null);
      await reloadPresets();
    }
  };

  return (
    <div className="purge-playground">
      <div className="purge-playground-tabs">
        <button type="button" className={cn("purge-tab", tab === "request" && "active")} onClick={() => setTab("request")}>
          <Cloud size={14} /> Permintaan purge
        </button>
        {canConfigure && (
          <button type="button" className={cn("purge-tab", tab === "config" && "active")} onClick={() => setTab("config")}>
            <Settings2 size={14} /> Konfigurasi Zone dan token
          </button>
        )}
      </div>

      {tab === "config" && canConfigure ? (
        <div className="card" style={{ maxWidth: 560 }}>
          <div className="card-header">
            <span className="card-title">Cloudflare (disimpan di server)</span>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
              Token perlu permission <strong>Zone → Cache Purge → Purge</strong>. Token tidak pernah ditampilkan ulang setelah disimpan; kosongkan field token jika hanya mengubah Zone ID.
            </p>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Zone ID</label>
              <input className="form-input mono" value={zoneId} onChange={(e) => setZoneId(e.target.value)} placeholder="dari dashboard Cloudflare → Overview" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">API Token {hasToken ? <span className="badge badge-green" style={{ fontSize: 9 }}>tersimpan</span> : null}</label>
              <input
                className="form-input mono"
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder={hasToken ? "•••••••• (isi baru untuk mengganti)" : "wajib diisi pertama kali"}
                autoComplete="off"
              />
            </div>
            <button type="button" className="btn btn-primary" onClick={saveConfig} disabled={savingCfg}>
              {savingCfg ? <Loader2 size={16} className="logbook-spin" /> : <Save size={16} />}
              Simpan konfigurasi
            </button>
          </div>
        </div>
      ) : null}

      {tab === "request" ? (
        <div className="purge-split">
          <aside className="purge-sidebar">
            <div className="purge-sidebar-head">PURGE CACHE</div>
            <div className="purge-sidebar-list">
              {presets.length === 0 ? (
                <div className="purge-sidebar-empty">Belum ada preset. {canConfigure ? "Tambah dari form di bawah." : "Minta admin menambahkan."}</div>
              ) : (
                presets.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={cn("purge-preset-row", activePresetId === p.id && "active")}
                    onClick={() => selectPreset(p)}
                  >
                    <span className="purge-method">POST</span>
                    <span className="purge-preset-name">{p.name}</span>
                  </button>
                ))
              )}
            </div>
            {canConfigure && (
              <div className="purge-sidebar-footer">
                <input
                  className="form-input"
                  style={{ marginBottom: 8, fontSize: 11 }}
                  placeholder="Nama preset baru…"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                />
                <button type="button" className="btn btn-primary btn-sm" style={{ width: "100%" }} onClick={addPreset}>
                  <Plus size={14} /> Simpan sebagai preset
                </button>
              </div>
            )}
          </aside>

          <div className="purge-main">
            <div className="purge-url-bar">
              <span className="purge-method-badge">POST</span>
              <code className="purge-url-text">{endpoint}</code>
              <button type="button" className="btn btn-primary purge-send" onClick={sendPurge} disabled={sending}>
                {sending ? <Loader2 size={16} className="logbook-spin" /> : <Play size={16} />}
                Send
              </button>
            </div>

            {err ? (
              <div className="alert-warning" style={{ margin: "0 0 10px", background: "var(--red-bg)", borderColor: "var(--red)", color: "var(--red-text)" }}>
                {err}
              </div>
            ) : null}

            {!hasToken && !canConfigure ? (
              <div className="alert-info">Admin belum mengatur Zone ID / token. Hubungi admin.</div>
            ) : null}

            <div className="purge-subtabs">
              <button type="button" className={cn("purge-subtab", respTab === "body" && "active")} onClick={() => setRespTab("body")}>
                Body
              </button>
              <button type="button" className={cn("purge-subtab", respTab === "response" && "active")} onClick={() => setRespTab("response")}>
                Response
              </button>
              {canConfigure && activePresetId && (
                <>
                  <span style={{ flex: 1 }} />
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => deletePreset(activePresetId)}>
                    <Trash2 size={14} /> Hapus preset
                  </button>
                  <button type="button" className="btn btn-sm" onClick={() => setEditingPreset(presets.find((x) => x.id === activePresetId) ?? null)}>
                    Edit nama / body
                  </button>
                </>
              )}
            </div>

            {respTab === "body" ? (
              <textarea className="purge-json-editor" value={bodyJson} onChange={(e) => setBodyJson(e.target.value)} spellCheck={false} />
            ) : (
              <pre className="purge-json-editor purge-response">{responseText || "Klik Send untuk melihat respons Cloudflare (JSON)."}</pre>
            )}

            {editingPreset && (
              <div className="card" style={{ marginTop: 12 }}>
                <div className="card-header">
                  <span className="card-title">Edit preset</span>
                  <button type="button" className="btn btn-sm" onClick={() => setEditingPreset(null)}>
                    Tutup
                  </button>
                </div>
                <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input className="form-input" value={editingPreset.name} onChange={(e) => setEditingPreset({ ...editingPreset, name: e.target.value })} />
                  <textarea
                    className="purge-json-editor"
                    style={{ minHeight: 160 }}
                    value={editingPreset.bodyJson}
                    onChange={(e) => setEditingPreset({ ...editingPreset, bodyJson: e.target.value })}
                    spellCheck={false}
                  />
                  <button type="button" className="btn btn-primary" onClick={savePresetEdit}>
                    Simpan preset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        .purge-playground {
          max-width: 1200px;
          margin: 0 auto;
        }
        .purge-playground-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }
        .purge-tab {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--bg-surface);
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
        }
        .purge-tab:hover {
          background: var(--bg-hover);
        }
        .purge-tab.active {
          border-color: var(--accent);
          color: var(--accent);
          background: var(--accent-muted);
        }
        .purge-split {
          display: flex;
          border: 1px solid var(--border);
          border-radius: 10px;
          overflow: hidden;
          min-height: 420px;
          background: var(--bg-surface);
        }
        .purge-sidebar {
          width: 240px;
          min-width: 200px;
          border-right: 1px solid var(--border);
          background: var(--bg-subtle);
          display: flex;
          flex-direction: column;
        }
        .purge-sidebar-head {
          padding: 10px 12px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--text-hint);
          border-bottom: 1px solid var(--border);
        }
        .purge-sidebar-list {
          flex: 1;
          overflow-y: auto;
          padding: 6px;
        }
        .purge-sidebar-empty {
          font-size: 11px;
          color: var(--text-muted);
          padding: 12px;
        }
        .purge-sidebar-footer {
          padding: 10px;
          border-top: 1px solid var(--border);
          background: var(--bg-surface);
        }
        .purge-preset-row {
          width: 100%;
          text-align: left;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          margin-bottom: 4px;
          border: none;
          border-radius: 6px;
          background: transparent;
          cursor: pointer;
          font-size: 12px;
          color: var(--text-primary);
        }
        .purge-preset-row:hover {
          background: var(--bg-hover);
        }
        .purge-preset-row.active {
          background: var(--bg-surface);
          box-shadow: 0 0 0 1px var(--accent);
        }
        .purge-method {
          font-size: 9px;
          font-weight: 800;
          color: var(--accent);
          font-family: "JetBrains Mono", monospace;
        }
        .purge-preset-name {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .purge-main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          padding: 12px 14px;
        }
        .purge-url-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }
        .purge-method-badge {
          font-size: 10px;
          font-weight: 800;
          padding: 4px 8px;
          border-radius: 4px;
          background: var(--accent);
          color: #fff;
          font-family: "JetBrains Mono", monospace;
        }
        .purge-url-text {
          flex: 1;
          min-width: 0;
          font-size: 11px;
          color: var(--text-secondary);
          word-break: break-all;
        }
        .purge-send {
          margin-left: auto;
          min-width: 88px;
          justify-content: center;
        }
        .purge-subtabs {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 6px;
        }
        .purge-subtab {
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 600;
          border: none;
          background: none;
          color: var(--text-muted);
          cursor: pointer;
          border-radius: 6px;
        }
        .purge-subtab.active {
          color: var(--accent);
          background: var(--accent-muted);
        }
        .purge-json-editor {
          flex: 1;
          width: 100%;
          min-height: 280px;
          font-family: "JetBrains Mono", ui-monospace, monospace;
          font-size: 12px;
          line-height: 1.45;
          padding: 12px;
          border: 1px solid var(--border-mid);
          border-radius: 8px;
          background: var(--bg-base);
          color: var(--text-primary);
          resize: vertical;
        }
        .purge-response {
          margin: 0;
          overflow: auto;
          white-space: pre-wrap;
        }
        @media (max-width: 768px) {
          .purge-split {
            flex-direction: column;
          }
          .purge-sidebar {
            width: 100%;
            border-right: none;
            border-bottom: 1px solid var(--border);
            max-height: 220px;
          }
        }
      `}</style>
    </div>
  );
}
