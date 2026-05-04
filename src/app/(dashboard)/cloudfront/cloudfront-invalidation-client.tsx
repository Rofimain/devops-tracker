"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";

type InitialSettings = {
  distributionId: string;
  region: string;
  hasAccessKey: boolean;
  hasSecret: boolean;
};

function parsePaths(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function CloudFrontInvalidationClient({
  configured,
  canConfigure,
  initialSettings,
}: {
  configured: boolean;
  canConfigure: boolean;
  initialSettings: InitialSettings | null;
}) {
  const [pathsText, setPathsText] = useState("/*\n");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [responseText, setResponseText] = useState("");

  const [tab, setTab] = useState<"invalidate" | "config">("invalidate");
  const [distId, setDistId] = useState(initialSettings?.distributionId ?? "");
  const [region, setRegion] = useState(initialSettings?.region ?? "us-east-1");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [cfgErr, setCfgErr] = useState("");
  const [cfgOk, setCfgOk] = useState("");

  const send = async () => {
    const paths = parsePaths(pathsText);
    if (paths.length === 0) {
      setErr("Tambahkan minimal satu path (satu per baris), mis. / atau /*");
      return;
    }
    setSending(true);
    setErr("");
    setResponseText("");
    try {
      const res = await fetch("/api/cloudfront/invalidation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      setResponseText(JSON.stringify(data, null, 2));
      if (!res.ok) {
        setErr(String(data.error ?? "Permintaan gagal"));
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Jaringan error");
    } finally {
      setSending(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    setCfgErr("");
    setCfgOk("");
    try {
      const res = await fetch("/api/settings/aws-cloudfront", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          distributionId: distId.trim(),
          region: region.trim() || "us-east-1",
          ...(accessKeyId.trim() ? { accessKeyId: accessKeyId.trim() } : {}),
          ...(secretAccessKey.trim() ? { secretAccessKey: secretAccessKey.trim() } : {}),
        }),
      });
      const data = (await res.json()) as { error?: string; distributionId?: string; region?: string };
      if (!res.ok) {
        setCfgErr(data.error ?? "Gagal menyimpan");
        return;
      }
      setCfgOk("Tersimpan.");
      if (data.distributionId !== undefined) setDistId(data.distributionId);
      if (data.region) setRegion(data.region);
      setAccessKeyId("");
      setSecretAccessKey("");
    } catch (e: unknown) {
      setCfgErr(e instanceof Error ? e.message : "Jaringan error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cloudfront-page">
      {canConfigure && (
        <div className="cloudfront-tabs">
          <button type="button" className={tab === "invalidate" ? "active" : ""} onClick={() => setTab("invalidate")}>
            Invalidation
          </button>
          <button type="button" className={tab === "config" ? "active" : ""} onClick={() => setTab("config")}>
            Konfigurasi AWS
          </button>
        </div>
      )}

      {(tab === "invalidate" || !canConfigure) && (
        <section className="card cloudfront-card">
          <h2 className="cloudfront-card-title">Invalidate cache (CloudFront)</h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
            Satu path per baris. Harus diawali <code>/</code>. Contoh: <code>{"/*"}</code> untuk semua, atau{" "}
            <code>{"/assets/*"}</code>.
          </p>
          {!configured && (
            <p style={{ fontSize: 13, color: "var(--accent-warning, #c9a227)", marginBottom: 12 }}>
              Belum dikonfigurasi. {canConfigure ? "Buka tab Konfigurasi AWS." : "Minta admin mengisi Distribution ID dan kunci IAM."}
            </p>
          )}
          <div className="cloudfront-quick">
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Cepat:</span>
            <button type="button" className="btn btn-sm" onClick={() => setPathsText("/*\n")}>
              {"/*"}
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setPathsText("/index.html\n")}>
              /index.html
            </button>
          </div>
          <textarea
            className="cloudfront-paths"
            value={pathsText}
            onChange={(e) => setPathsText(e.target.value)}
            rows={8}
            spellCheck={false}
            placeholder={"/*\n/static/app.js"}
          />
          {err && (
            <p style={{ fontSize: 13, color: "var(--accent-danger, #c44)", marginTop: 8 }}>
              {err}
            </p>
          )}
          <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
            <button type="button" className="btn btn-primary" onClick={send} disabled={sending || !configured}>
              {sending ? <Loader2 size={16} className="cloudfront-spin" /> : <Send size={16} />}
              Kirim invalidation
            </button>
          </div>
          {responseText && (
            <pre className="cloudfront-response">{responseText}</pre>
          )}
        </section>
      )}

      {canConfigure && tab === "config" && initialSettings && (
        <section className="card cloudfront-card">
          <h2 className="cloudfront-card-title">Konfigurasi AWS (IAM)</h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
            User IAM perlu permission <code>cloudfront:CreateInvalidation</code> pada distribution ini. Secret disimpan terenkripsi di basis data
            aplikasi (sama seperti token Cloudflare).
          </p>
          <label className="cloudfront-field">
            <span>Distribution ID</span>
            <input value={distId} onChange={(e) => setDistId(e.target.value)} placeholder="E1234567890ABC" autoComplete="off" />
          </label>
          <label className="cloudfront-field">
            <span>Region (biasanya us-east-1 untuk API CloudFront)</span>
            <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="us-east-1" autoComplete="off" />
          </label>
          <label className="cloudfront-field">
            <span>Access key ID {initialSettings.hasAccessKey && <em>(tersimpan — kosongkan jika tidak diubah)</em>}</span>
            <input
              value={accessKeyId}
              onChange={(e) => setAccessKeyId(e.target.value)}
              placeholder={initialSettings.hasAccessKey ? "•••• (tidak ditampilkan)" : ""}
              autoComplete="off"
            />
          </label>
          <label className="cloudfront-field">
            <span>Secret access key {initialSettings.hasSecret && <em>(tersimpan — kosongkan jika tidak diubah)</em>}</span>
            <input
              type="password"
              value={secretAccessKey}
              onChange={(e) => setSecretAccessKey(e.target.value)}
              placeholder={initialSettings.hasSecret ? "••••" : ""}
              autoComplete="new-password"
            />
          </label>
          {cfgErr && <p style={{ fontSize: 13, color: "var(--accent-danger, #c44)" }}>{cfgErr}</p>}
          {cfgOk && <p style={{ fontSize: 13, color: "var(--accent-success, #2a5)" }}>{cfgOk}</p>}
          <button type="button" className="btn btn-primary" onClick={saveConfig} disabled={saving}>
            {saving ? <Loader2 size={16} className="cloudfront-spin" /> : null}
            Simpan konfigurasi
          </button>
        </section>
      )}

      <style jsx>{`
        .cloudfront-page {
          max-width: 720px;
        }
        .cloudfront-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }
        .cloudfront-tabs button {
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid var(--border-subtle);
          background: var(--bg-elevated);
          color: var(--text-secondary);
          font-size: 13px;
          cursor: pointer;
        }
        .cloudfront-tabs button.active {
          border-color: var(--accent-primary);
          color: var(--text-primary);
          background: var(--bg-subtle);
        }
        .cloudfront-card {
          padding: 20px;
          margin-bottom: 16px;
        }
        .cloudfront-card-title {
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 8px 0;
        }
        .cloudfront-quick {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
          margin-bottom: 8px;
        }
        .cloudfront-paths {
          width: 100%;
          font-family: ui-monospace, monospace;
          font-size: 13px;
          padding: 10px;
          border-radius: 8px;
          border: 1px solid var(--border-subtle);
          background: var(--bg-app);
          color: var(--text-primary);
          resize: vertical;
          min-height: 140px;
        }
        .cloudfront-response {
          margin-top: 16px;
          padding: 12px;
          border-radius: 8px;
          background: var(--bg-subtle);
          font-size: 12px;
          overflow: auto;
          max-height: 280px;
        }
        .cloudfront-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 14px;
          font-size: 13px;
        }
        .cloudfront-field span {
          color: var(--text-secondary);
        }
        .cloudfront-field input {
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid var(--border-subtle);
          background: var(--bg-app);
          color: var(--text-primary);
          font-size: 13px;
        }
        .cloudfront-field em {
          font-size: 11px;
          font-style: normal;
          color: var(--text-muted);
        }
        :global(.cloudfront-spin) {
          animation: cloudfront-spin-kf 0.8s linear infinite;
        }
        @keyframes cloudfront-spin-kf {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
