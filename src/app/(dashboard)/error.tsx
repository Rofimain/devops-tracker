"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>Terjadi Kesalahan</div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20, maxWidth: 400, margin: "0 auto 20px" }}>{error.message}</div>
      <button className="btn btn-primary" onClick={reset}>Coba Lagi</button>
    </div>
  );
}
