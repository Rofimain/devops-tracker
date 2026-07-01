"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";

type InitialSettings = {
  distributionId: string;
  region: string;
  hasAccessKey: boolean;
  hasSecret: boolean;
};

type ConfigSummary = {
  /** Kosong untuk operator — jangan tampilkan ID mentah. Admin dapat ID lengkap. */
  distributionId: string;
  hasAccessKey: boolean;
  hasSecret: boolean;
};

type InvalidationPoll = {
  invalidationId: string;
  status: string | null;
  createTime: string | null;
};

function parsePaths(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const POLL_MS = 2000;
const POLL_MAX = 90;

export function CloudFrontInvalidationClient({
  configured,
  canConfigure,
  isOperator,
  initialSettings,
  configSummary,
}: {
  configured: boolean;
  canConfigure: boolean;
  isOperator: boolean;
  initialSettings: InitialSettings | null;
  configSummary: ConfigSummary;
}) {
  const router = useRouter();
  const [pathsText, setPathsText] = useState("/*\n");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [responseText, setResponseText] = useState("");
  const [distributionDescription, setDistributionDescription] = useState<string | null>(null);
  const [distributionDescriptionError, setDistributionDescriptionError] = useState<string | null>(null);
  const [loadingDescription, setLoadingDescription] = useState(configured);

  const [invPoll, setInvPoll] = useState<InvalidationPoll | null>(null);
  const [pollErr, setPollErr] = useState("");
  const pollCountRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [tab, setTab] = useState<"invalidate" | "config">("invalidate");
  const [distId, setDistId] = useState(initialSettings?.distributionId ?? "");
  const [region, setRegion] = useState(initialSettings?.region ?? "us-east-1");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [cfgErr, setCfgErr] = useState("");
  const [cfgOk, setCfgOk] = useState("");

  useEffect(() => {
    if (!configured) {
      setLoadingDescription(false);
      return;
    }
    let cancelled = false;
    setLoadingDescription(true);
    fetch("/api/cloudfront/distribution-label")
      .then(async (res) => {
        const data = (await res.json()) as { label?: string | null; fetchError?: string | null; error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setDistributionDescriptionError(data.error ?? "Gagal memuat deskripsi");
          return;
        }
        setDistributionDescription(data.label ?? null);
        setDistributionDescriptionError(data.fetchError ?? null);
      })
      .catch(() => {
        if (!cancelled) setDistributionDescriptionError("Gagal memuat deskripsi dari AWS");
      })
      .finally(() => {
        if (!cancelled) setLoadingDescription(false);
      });
    return () => {
      cancelled = true;
    };
  }, [configured]);

  useEffect(() => {
    if (!initialSettings) return;
    setDistId(initialSettings.distributionId);
    setRegion(initialSettings.region);
  }, [initialSettings]);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pollCountRef.current = 0;
  };

  const fetchInvalidationStatus = async (id: string): Promise<InvalidationPoll | null> => {
    const res = await fetch(`/api/cloudfront/invalidation?id=${encodeURIComponent(id)}`);
    const data = (await res.json()) as {
      error?: string;
      invalidationId?: string;
      status?: string | null;
      createTime?: string | null;
    };
    if (!res.ok) {
      setPollErr(data.error ?? "Gagal mengambil status");
      return null;
    }
    setPollErr("");
    return {
      invalidationId: data.invalidationId ?? id,
      status: data.status ?? null,
      createTime: data.createTime ?? null,
    };
  };

  const startPolling = (first: InvalidationPoll) => {
    stopPolling();
    setInvPoll(first);
    pollCountRef.current = 0;

    if (first.status === "Completed") return;

    pollTimerRef.current = setInterval(async () => {
      pollCountRef.current += 1;
      if (pollCountRef.current > POLL_MAX) {
        stopPolling();
        setPollErr("Pengecekan status dihentikan setelah beberapa menit. Cek konsol AWS atau log aktivitas.");
        return;
      }
      const next = await fetchInvalidationStatus(first.invalidationId);
      if (!next) {
        stopPolling();
        return;
      }
      setInvPoll(next);
      if (next.status === "Completed") {
        stopPolling();
      }
    }, POLL_MS);
  };

  const send = async () => {
    const paths = parsePaths(pathsText);
    if (paths.length === 0) {
      setErr("Tambahkan minimal satu path (satu per baris), mis. / atau /*");
      return;
    }
    setSending(true);
    setErr("");
    setResponseText("");
    setPollErr("");
    stopPolling();
    setInvPoll(null);
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
        return;
      }
      const invId = typeof data.invalidationId === "string" ? data.invalidationId : "";
      const status = typeof data.status === "string" ? data.status : null;
      const createTime = typeof data.createTime === "string" ? data.createTime : null;
      if (invId) {
        startPolling({
          invalidationId: invId,
          status,
          createTime,
        });
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
      const data = (await res.json()) as {
        error?: string;
        distributionId?: string;
        region?: string;
        hasAccessKey?: boolean;
        hasSecret?: boolean;
      };
      if (!res.ok) {
        setCfgErr(data.error ?? "Gagal menyimpan");
        return;
      }
      setCfgOk("Tersimpan. Ringkasan di bawah akan diperbarui.");
      if (data.distributionId !== undefined) setDistId(data.distributionId);
      if (data.region) setRegion(data.region);
      setAccessKeyId("");
      setSecretAccessKey("");
      router.refresh();
    } catch (e: unknown) {
      setCfgErr(e instanceof Error ? e.message : "Jaringan error");
    } finally {
      setSaving(false);
    }
  };

  const statusLabel = (s: string | null) => {
    if (!s) return "—";
    if (s === "Completed") return "Selesai (Completed)";
    if (s === "InProgress") return "Berjalan (InProgress)";
    return s;
  };

  const statusTone = (s: string | null) => {
    if (s === "Completed") return "var(--accent-success, #2a5)";
    if (s === "InProgress") return "var(--accent-warning, #c9a227)";
    return "var(--text-secondary)";
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

          <div className="cloudfront-summary">
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
              {isOperator ? "Konfigurasi" : "Status konfigurasi (di server)"}
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--text-secondary)" }}>
              <li>
                Deskripsi (dari AWS):{" "}
                {loadingDescription ? (
                  <span style={{ color: "var(--text-muted)" }}>memuat…</span>
                ) : distributionDescription?.trim() ? (
                  <span style={{ color: "var(--text-primary)" }}>{distributionDescription.trim()}</span>
                ) : (
                  <span style={{ color: "var(--text-muted)" }}>—</span>
                )}
              </li>
              {!isOperator ? (
                <li>
                  Distribution ID:{" "}
                  {configSummary.distributionId ? (
                    <code>{configSummary.distributionId}</code>
                  ) : (
                    <span style={{ color: "var(--accent-warning, #c9a227)" }}>belum diisi</span>
                  )}
                </li>
              ) : null}
              <li>Access key: {configSummary.hasAccessKey ? "tersimpan ✓" : "belum ✗"}</li>
              <li>Secret key: {configSummary.hasSecret ? "tersimpan ✓" : "belum ✗"}</li>
            </ul>
            {distributionDescriptionError ? (
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, marginBottom: 0 }}>
                Gagal memuat deskripsi dari AWS: {distributionDescriptionError}. Periksa permission IAM{" "}
                <code>cloudfront:GetDistribution</code> pada distribution ini.
              </p>
            ) : null}
            {!isOperator ? (
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8, marginBottom: 0 }}>
                Field kunci di tab Konfigurasi sengaja kosong setelah simpan (nilai tidak ditampilkan). Untuk audit
                perubahan,
                {canConfigure ? (
                  <>
                    {" "}
                    buka{" "}
                    <Link href="/admin/activity" style={{ color: "var(--accent)" }}>
                      Log aktivitas
                    </Link>
                    .
                  </>
                ) : (
                  " minta admin mengecek Log aktivitas."
                )}
              </p>
            ) : (
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8, marginBottom: 0 }}>
                Distribution ID tidak ditampilkan untuk peran operator. Kunci disimpan di server; hubungi admin untuk audit
                atau detail teknis.
              </p>
            )}
          </div>

          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
            Satu path per baris. Harus diawali <code>/</code>. Contoh: <code>{"/*"}</code> untuk semua, atau{" "}
            <code>{"/assets/*"}</code>.
          </p>
          {!configured && (
            <p style={{ fontSize: 13, color: "var(--accent-warning, #c9a227)", marginBottom: 12 }}>
              Invalidation tidak bisa jalan sampai Distribution ID + access key + secret tersimpan. Lengkapi di tab Konfigurasi
              AWS (admin) — lalu pastikan ketiga indikator di atas bertanda ✓.
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

          {invPoll && (
            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 8,
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-subtle)",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Status invalidation</div>
              <div style={{ fontSize: 13 }}>
                <span style={{ color: "var(--text-muted)" }}>ID: </span>
                <code>{invPoll.invalidationId}</code>
              </div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                <span style={{ color: "var(--text-muted)" }}>Status: </span>
                <strong style={{ color: statusTone(invPoll.status) }}>{statusLabel(invPoll.status)}</strong>
                {invPoll.status === "InProgress" ? (
                  <span style={{ marginLeft: 8, fontSize: 12, color: "var(--text-muted)" }}>
                    (memperbarui otomatis…)
                  </span>
                ) : null}
              </div>
              {pollErr && (
                <p style={{ fontSize: 12, color: "var(--accent-danger, #c44)", marginTop: 8, marginBottom: 0 }}>
                  {pollErr}
                </p>
              )}
            </div>
          )}

          <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" className="btn btn-primary" onClick={send} disabled={sending}>
              {sending ? <Loader2 size={16} className="cloudfront-spin" /> : <Send size={16} />}
              Kirim invalidation
            </button>
            {!configured ? (
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Tombol tetap bisa diklik — error dari server jika belum lengkap.</span>
            ) : null}
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
            User IAM perlu permission <code>cloudfront:CreateInvalidation</code>, <code>cloudfront:GetInvalidation</code>,
            dan <code>cloudfront:GetDistribution</code> (untuk menampilkan deskripsi distribution). Kunci disimpan di
            database aplikasi (server); setelah simpan, secret tidak ditampilkan lagi — sama seperti token Cloudflare.
          </p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
            API CloudFront di SDK selalu memakai region <code>us-east-1</code> (syarat AWS). Field Region di bawah hanya
            catatan/legacy; tidak mempengaruhi panggilan invalidation.
          </p>

          <div className="cloudfront-summary" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Ringkasan saat ini</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--text-secondary)" }}>
              <li>
                Deskripsi (dari AWS):{" "}
                {distributionDescription?.trim() ? (
                  distributionDescription.trim()
                ) : (
                  <span style={{ color: "var(--text-muted)" }}>—</span>
                )}
              </li>
              <li>
                Distribution ID: {configSummary.distributionId ? <code>{configSummary.distributionId}</code> : "—"}
              </li>
              <li>Access key: {configSummary.hasAccessKey ? "tersimpan ✓" : "belum ✗"}</li>
              <li>Secret key: {configSummary.hasSecret ? "tersimpan ✓" : "belum ✗"}</li>
            </ul>
            {distributionDescriptionError ? (
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, marginBottom: 0 }}>
                Deskripsi gagal dimuat: {distributionDescriptionError}
              </p>
            ) : null}
          </div>

          <label className="cloudfront-field">
            <span>Distribution ID</span>
            <input value={distId} onChange={(e) => setDistId(e.target.value)} placeholder="E1234567890ABC" autoComplete="off" />
          </label>
          <label className="cloudfront-field">
            <span>Region (catatan; API CloudFront pakai us-east-1)</span>
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
        .cloudfront-summary {
          margin-bottom: 16px;
          padding: 12px;
          border-radius: 8px;
          background: var(--bg-subtle);
          border: 1px solid var(--border-subtle);
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
