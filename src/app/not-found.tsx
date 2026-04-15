import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-base)" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 64, fontWeight: 700, color: "var(--text-hint)", lineHeight: 1 }}>404</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginTop: 12 }}>Halaman tidak ditemukan</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>Resource yang kamu cari tidak ada atau sudah dihapus.</div>
        <Link href="/" className="btn btn-primary" style={{ marginTop: 20, display: "inline-flex" }}>← Kembali ke Dashboard</Link>
      </div>
    </div>
  );
}
