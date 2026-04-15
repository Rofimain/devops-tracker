export default function Loading() {
  return (
    <div style={{ padding: 20 }}>
      <div style={{ height: 52, background: "var(--bg-surface)", borderBottom: "1px solid var(--border)", marginBottom: 20 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ height: 80, borderRadius: 10, background: "var(--bg-surface)", border: "1px solid var(--border)", animation: "pulse 1.5s ease-in-out infinite" }} />
        ))}
      </div>
      <div style={{ height: 300, borderRadius: 10, background: "var(--bg-surface)", border: "1px solid var(--border)" }} />
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}
