"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const digest = error.digest;
  const isGenericProd =
    !error.message ||
    error.message.includes("omitted in production") ||
    error.message.includes("Server Components render");
  const detail = !isGenericProd
    ? error.message
    : digest
        ? `Digest: ${digest} (kirim ke tim dev bila perlu)`
        : "Detail disembunyikan di production. Cek log server / jalankan ulang migrasi database.";

  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>Terjadi Kesalahan</div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16, maxWidth: 440, margin: "0 auto", lineHeight: 1.5 }}>
        {detail}
      </div>
      <p style={{ fontSize: 11, color: "var(--text-hint)", maxWidth: 420, margin: "0 auto 20px", lineHeight: 1.45 }}>
        Penyebab umum setelah deploy: tabel/kolom database belum selaras dengan kode (mis.{" "}
        <code className="mono">Doc.contentType</code>, <code className="mono">LogbookEntry</code>), koneksi DB, atau variabel
        lingkungan yang hilang. Deploy menjalankan <code className="mono">prisma db push</code>; restart app jika error masih muncul.
      </p>
      <button type="button" className="btn btn-primary" onClick={reset}>
        Coba Lagi
      </button>
    </div>
  );
}
