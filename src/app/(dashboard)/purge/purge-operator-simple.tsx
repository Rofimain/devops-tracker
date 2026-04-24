"use client";

import { useState } from "react";
import { Loader2, Play } from "lucide-react";

export type OperatorPresetRow = {
  id: string;
  name: string;
  bodyJson: string;
  effectiveZoneId: string;
  zoneLabel: string | null;
};

function parseLines(text: string): { files: string[] } | { hosts: string[] } | { error: string } {
  const raw = text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (raw.length === 0) return { error: "Tambahkan minimal satu URL atau hostname." };

  const hasUrl = raw.some((l) => l.includes("://"));
  const hasPlain = raw.some((l) => !l.includes("://"));

  if (hasUrl && hasPlain) {
    return {
      error:
        "Jangan campur URL (https://…) dan hostname mentah. Gunakan hanya baris URL, atau hanya baris hostname.",
    };
  }

  if (hasUrl) return { files: raw };
  return { hosts: raw };
}

export function PurgeOperatorSimple({
  initialHasToken,
  defaultZoneId,
  defaultZoneRootHint,
  presetRows,
}: {
  initialHasToken: boolean;
  defaultZoneId: string;
  defaultZoneRootHint: string | null;
  presetRows: OperatorPresetRow[];
}) {
  /** Baris URL manual per preset (key = preset id) */
  const [manualLinesByPreset, setManualLinesByPreset] = useState<Record<string, string>>({});
  const [defaultLines, setDefaultLines] = useState("");
  const [err, setErr] = useState("");
  const [responseText, setResponseText] = useState("");
  /** `id:json` | `id:manual` | `default:manual` | null */
  const [busy, setBusy] = useState<string | null>(null);

  const isBusy = busy !== null;

  const setManualFor = (presetId: string, value: string) => {
    setManualLinesByPreset((prev) => ({ ...prev, [presetId]: value }));
  };

  const postPurge = async (zoneId: string, purgeBody: Record<string, unknown>) => {
    const res = await fetch("/api/cloudflare/purge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zoneId, ...purgeBody }),
    });
    const data = (await res.json()) as { body?: string; error?: string; message?: string };
    const text = typeof data.body === "string" ? data.body : JSON.stringify(data, null, 2);
    return { res, data, text };
  };

  const runPresetJson = async (row: OperatorPresetRow) => {
    let inner: unknown;
    try {
      inner = JSON.parse(row.bodyJson);
    } catch {
      setErr("Preset berisi JSON tidak valid. Minta admin memperbaiki.");
      return;
    }
    if (!inner || typeof inner !== "object" || Array.isArray(inner)) {
      setErr("Body preset harus object JSON.");
      return;
    }
    setBusy(`${row.id}:json`);
    setErr("");
    setResponseText("");
    try {
      const { res, data, text } = await postPurge(row.effectiveZoneId, inner as Record<string, unknown>);
      setResponseText(text);
      if (!res.ok) {
        setErr(data.error || data.message || "Permintaan gagal");
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Jaringan error");
    } finally {
      setBusy(null);
    }
  };

  const runPresetManual = async (row: OperatorPresetRow) => {
    const text = manualLinesByPreset[row.id] ?? "";
    const parsed = parseLines(text);
    if ("error" in parsed) {
      setErr(parsed.error);
      return;
    }
    setBusy(`${row.id}:manual`);
    setErr("");
    setResponseText("");
    try {
      const body = "files" in parsed ? { files: parsed.files } : { hosts: parsed.hosts };
      const { res, data, text: respText } = await postPurge(row.effectiveZoneId, body);
      setResponseText(respText);
      if (!res.ok) {
        setErr(data.error || data.message || "Permintaan gagal");
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Jaringan error");
    } finally {
      setBusy(null);
    }
  };

  const runDefaultManual = async () => {
    const dz = defaultZoneId.trim();
    if (!dz) {
      setErr("Zone ID default belum diatur admin.");
      return;
    }
    const parsed = parseLines(defaultLines);
    if ("error" in parsed) {
      setErr(parsed.error);
      return;
    }
    setBusy("default:manual");
    setErr("");
    setResponseText("");
    try {
      const body = "files" in parsed ? { files: parsed.files } : { hosts: parsed.hosts };
      const { res, data, text } = await postPurge(dz, body);
      setResponseText(text);
      if (!res.ok) {
        setErr(data.error || data.message || "Permintaan gagal");
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Jaringan error");
    } finally {
      setBusy(null);
    }
  };

  const showDefaultManualBlock = presetRows.length === 0 && Boolean(defaultZoneId.trim());

  const phForRow = (row: OperatorPresetRow) => {
    const z = row.zoneLabel;
    if (z) {
      return { url: `https://${z}/path/ke/file`, host: `www.${z}` };
    }
    return { url: "https://www.example.com/path", host: "www.example.com" };
  };

  const phDefaultUrl = defaultZoneRootHint ? `https://${defaultZoneRootHint}/path/ke/file` : "https://www.example.com/path/ke/file";
  const phDefaultHost = defaultZoneRootHint ? `www.${defaultZoneRootHint}` : "www.example.com";

  return (
    <div style={{ maxWidth: 720 }}>
      {!initialHasToken ? (
        <div className="alert-info" style={{ marginBottom: 14 }}>
          Admin belum mengatur API token Cloudflare. Hubungi admin.
        </div>
      ) : null}

      {presetRows.length > 0 ? (
        <div style={{ marginBottom: showDefaultManualBlock ? 28 : 8 }}>
          <div className="form-label" style={{ marginBottom: 10 }}>
            Preset purge
          </div>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 14px", lineHeight: 1.55 }}>
            Tiap preset punya zone sendiri. <strong>Jalankan</strong> mengirim body JSON yang disimpan admin; isian di bawahnya adalah{" "}
            <strong>URL/hostname manual</strong> khusus zone preset tersebut.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {presetRows.map((row) => {
              const ph = phForRow(row);
              const lines = manualLinesByPreset[row.id] ?? "";
              const jsonBusy = busy === `${row.id}:json`;
              const manualBusy = busy === `${row.id}:manual`;
              return (
                <div
                  key={row.id}
                  className="card"
                  style={{ margin: 0, border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}
                >
                  <div className="card-body" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{row.name}</div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--text-muted)",
                            marginTop: 6,
                            fontFamily: "JetBrains Mono, ui-monospace, monospace",
                            lineHeight: 1.45,
                          }}
                        >
                          zone: {row.zoneLabel ? <strong style={{ color: "var(--text-secondary)" }}>{row.zoneLabel}</strong> : null}
                          {row.zoneLabel ? <span> · </span> : null}
                          <span title={row.effectiveZoneId}>
                            {row.effectiveZoneId.slice(0, 22)}
                            {row.effectiveZoneId.length > 22 ? "…" : ""}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => runPresetJson(row)}
                        disabled={!initialHasToken || isBusy}
                      >
                        {jsonBusy ? <Loader2 size={16} className="logbook-spin" style={{ marginRight: 6 }} /> : <Play size={16} style={{ marginRight: 6 }} />}
                        Jalankan preset
                      </button>
                    </div>

                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                      <div className="form-label" style={{ marginBottom: 6 }}>
                        URL / hostname manual
                        {row.zoneLabel ? (
                          <>
                            {" "}
                            (<span className="mono">{row.zoneLabel}</span>)
                          </>
                        ) : null}
                      </div>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 8px", lineHeight: 1.45 }}>
                        Hanya target yang termasuk zone ini. Satu URL (https://…) atau hostname per baris.
                      </p>
                      <textarea
                        className="form-input mono"
                        style={{ minHeight: 100, width: "100%", resize: "vertical", fontSize: 13, lineHeight: 1.45 }}
                        value={lines}
                        onChange={(e) => setManualFor(row.id, e.target.value)}
                        placeholder={`${ph.url}\natau\n${ph.host}`}
                        spellCheck={false}
                        disabled={!initialHasToken || isBusy}
                      />
                      <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => runPresetManual(row)}
                          disabled={!initialHasToken || isBusy}
                        >
                          {manualBusy ? <Loader2 size={16} className="logbook-spin" style={{ marginRight: 6 }} /> : null}
                          Purge cache (manual)
                        </button>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => {
                            setManualFor(row.id, "");
                            setErr("");
                            setResponseText("");
                          }}
                          disabled={isBusy}
                        >
                          Kosongkan
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {showDefaultManualBlock ? (
        <>
          <div className="form-label" style={{ marginBottom: 8, marginTop: presetRows.length ? 24 : 0 }}>
            URL / hostname manual (zone default)
          </div>
          {defaultZoneRootHint ? (
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 12px", lineHeight: 1.55 }}>
              Memakai zone default <strong className="mono">{defaultZoneRootHint}</strong>.
            </p>
          ) : (
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px", lineHeight: 1.55 }}>
              Memakai Zone ID default dari konfigurasi admin.
            </p>
          )}
          <textarea
            className="form-input mono"
            style={{ minHeight: 120, width: "100%", resize: "vertical", fontSize: 13, lineHeight: 1.45 }}
            value={defaultLines}
            onChange={(e) => setDefaultLines(e.target.value)}
            placeholder={`${phDefaultUrl}\natau\n${phDefaultHost}`}
            spellCheck={false}
            disabled={!initialHasToken || isBusy}
          />
          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-primary" onClick={runDefaultManual} disabled={!initialHasToken || isBusy}>
              {busy === "default:manual" ? <Loader2 size={16} className="logbook-spin" style={{ marginRight: 6 }} /> : null}
              Purge cache (manual)
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setDefaultLines("");
                setErr("");
                setResponseText("");
              }}
              disabled={isBusy}
            >
              Kosongkan
            </button>
          </div>
        </>
      ) : null}

      {!presetRows.length && !defaultZoneId.trim() ? (
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12 }}>
          Belum ada preset dengan Zone ID. Minta admin menambahkan preset atau Zone ID default.
        </p>
      ) : null}

      {err ? (
        <div
          className="alert-warning"
          style={{
            marginTop: 14,
            background: "var(--red-bg)",
            borderColor: "var(--red)",
            color: "var(--red-text)",
            fontSize: 13,
          }}
        >
          {err}
        </div>
      ) : null}

      {responseText ? (
        <div style={{ marginTop: 18 }}>
          <div className="form-label" style={{ marginBottom: 6 }}>
            Respons Cloudflare
          </div>
          <pre
            className="mono"
            style={{
              fontSize: 12,
              padding: 12,
              borderRadius: 8,
              border: "1px solid var(--border-mid)",
              background: "var(--bg-base)",
              overflow: "auto",
              maxHeight: 280,
              margin: 0,
              whiteSpace: "pre-wrap",
            }}
          >
            {responseText}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
