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
  const [lines, setLines] = useState("");
  const [sending, setSending] = useState(false);
  const [presetSendingId, setPresetSendingId] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [responseText, setResponseText] = useState("");

  const parseLines = (): { files: string[] } | { hosts: string[] } | { error: string } => {
    const raw = lines
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (raw.length === 0) return { error: "Tambahkan minimal satu URL atau hostname." };

    const hasUrl = raw.some((l) => l.includes("://"));
    const hasPlain = raw.some((l) => !l.includes("://"));

    if (hasUrl && hasPlain) {
      return {
        error:
          "Jangan campur URL (https://…) dan hostname mentah dalam satu permintaan. Kirim hanya baris URL, atau hanya baris hostname.",
      };
    }

    if (hasUrl) return { files: raw };
    return { hosts: raw };
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

  const runPreset = async (row: OperatorPresetRow) => {
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
    setPresetSendingId(row.id);
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
      setPresetSendingId(null);
    }
  };

  const send = async () => {
    const parsed = parseLines();
    if ("error" in parsed) {
      setErr(parsed.error);
      return;
    }
    const dz = defaultZoneId.trim();
    if (!dz) {
      setErr("Zone ID default belum diatur admin. Gunakan preset yang sudah punya zone, atau minta admin mengisi Konfigurasi.");
      return;
    }
    setSending(true);
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
      setSending(false);
    }
  };

  const phHost = defaultZoneRootHint ? `www.${defaultZoneRootHint}` : "www.example.com";
  const phUrl = defaultZoneRootHint ? `https://${defaultZoneRootHint}/path/ke/file` : "https://www.example.com/path/ke/file";

  return (
    <div style={{ maxWidth: 720 }}>
      {!initialHasToken ? (
        <div className="alert-info" style={{ marginBottom: 14 }}>
          Admin belum mengatur API token Cloudflare. Hubungi admin.
        </div>
      ) : null}

      {presetRows.length > 0 ? (
        <div style={{ marginBottom: 28 }}>
          <div className="form-label" style={{ marginBottom: 10 }}>
            Preset purge
          </div>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 12px", lineHeight: 1.55 }}>
            Tiap preset punya Zone ID sendiri (token sama). Klik jalankan untuk mengirim body preset ke zone yang tertera.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {presetRows.map((row) => (
              <div
                key={row.id}
                className="card"
                style={{ margin: 0, border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}
              >
                <div
                  className="card-body"
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{row.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, fontFamily: "JetBrains Mono, ui-monospace, monospace" }}>
                      zone: {row.zoneLabel ? <strong style={{ color: "var(--text-secondary)" }}>{row.zoneLabel}</strong> : null}
                      {row.zoneLabel ? <span> · </span> : null}
                      <span title={row.effectiveZoneId}>{row.effectiveZoneId.slice(0, 18)}{row.effectiveZoneId.length > 18 ? "…" : ""}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => runPreset(row)}
                    disabled={!initialHasToken || presetSendingId !== null || sending}
                  >
                    {presetSendingId === row.id ? (
                      <Loader2 size={16} className="logbook-spin" style={{ marginRight: 6 }} />
                    ) : (
                      <Play size={16} style={{ marginRight: 6 }} />
                    )}
                    Jalankan
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="form-label" style={{ marginBottom: 8 }}>
        URL / hostname manual
      </div>
      {defaultZoneRootHint && defaultZoneId.trim() ? (
        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 12px", lineHeight: 1.55 }}>
          Memakai zone default <strong className="mono">{defaultZoneRootHint}</strong>. Target di luar zone ditolak di server.
        </p>
      ) : defaultZoneId.trim() ? (
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px", lineHeight: 1.55 }}>
          Memakai Zone ID default dari konfigurasi admin.
        </p>
      ) : (
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px", lineHeight: 1.55 }}>
          Tanpa Zone ID default, isian manual tidak bisa dikirim — gunakan preset di atas atau minta admin mengisi Zone ID default.
        </p>
      )}

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label">Satu URL (https://…) atau hostname per baris</label>
        <textarea
          className="form-input mono"
          style={{ minHeight: 120, width: "100%", resize: "vertical", fontSize: 13, lineHeight: 1.45 }}
          value={lines}
          onChange={(e) => setLines(e.target.value)}
          placeholder={`${phUrl}\natau\n${phHost}`}
          spellCheck={false}
          disabled={!defaultZoneId.trim()}
        />
      </div>

      {err ? (
        <div
          className="alert-warning"
          style={{
            marginTop: 10,
            background: "var(--red-bg)",
            borderColor: "var(--red)",
            color: "var(--red-text)",
            fontSize: 13,
          }}
        >
          {err}
        </div>
      ) : null}

      <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={send}
          disabled={sending || !initialHasToken || !defaultZoneId.trim() || presetSendingId !== null}
        >
          {sending ? <Loader2 size={16} className="logbook-spin" style={{ marginRight: 6 }} /> : null}
          Purge cache (manual)
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setLines("");
            setErr("");
            setResponseText("");
          }}
          disabled={sending || presetSendingId !== null}
        >
          Kosongkan
        </button>
      </div>

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
