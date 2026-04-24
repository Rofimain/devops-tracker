"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

export function PurgeOperatorSimple({
  initialHasToken,
  zoneRootHint,
}: {
  initialHasToken: boolean;
  zoneRootHint: string | null;
}) {
  const [lines, setLines] = useState("");
  const [sending, setSending] = useState(false);
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

  const send = async () => {
    const parsed = parseLines();
    if ("error" in parsed) {
      setErr(parsed.error);
      return;
    }
    setSending(true);
    setErr("");
    setResponseText("");
    try {
      const body = "files" in parsed ? { files: parsed.files } : { hosts: parsed.hosts };
      const res = await fetch("/api/cloudflare/purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { body?: string; error?: string; message?: string };
      const text = typeof data.body === "string" ? data.body : JSON.stringify(data, null, 2);
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

  const phHost = zoneRootHint ? `www.${zoneRootHint}` : "www.example.com";
  const phUrl = zoneRootHint ? `https://${zoneRootHint}/path/ke/file` : "https://www.example.com/path/ke/file";

  return (
    <div style={{ maxWidth: 560 }}>
      {!initialHasToken ? (
        <div className="alert-info" style={{ marginBottom: 14 }}>
          Admin belum mengatur Zone ID / token. Hubungi admin.
        </div>
      ) : null}

      {zoneRootHint ? (
        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 12px", lineHeight: 1.55 }}>
          Hanya URL atau hostname untuk zone <strong className="mono">{zoneRootHint}</strong>. Target di luar zone ditolak sebelum dikirim ke Cloudflare.
        </p>
      ) : initialHasToken ? (
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 12px", lineHeight: 1.55 }}>
          Setiap baris dicek ke zone yang dikonfigurasi di server. Jika nama zone tidak tampil, refresh halaman atau hubungi admin.
        </p>
      ) : null}

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label">URL (https://…) atau hostname, satu per baris</label>
        <textarea
          className="form-input mono"
          style={{ minHeight: 140, width: "100%", resize: "vertical", fontSize: 13, lineHeight: 1.45 }}
          value={lines}
          onChange={(e) => setLines(e.target.value)}
          placeholder={`${phUrl}\natau\n${phHost}`}
          spellCheck={false}
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
        <button type="button" className="btn btn-primary" onClick={send} disabled={sending || !initialHasToken}>
          {sending ? <Loader2 size={16} className="logbook-spin" style={{ marginRight: 6 }} /> : null}
          Purge cache
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setLines("");
            setErr("");
            setResponseText("");
          }}
          disabled={sending}
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
