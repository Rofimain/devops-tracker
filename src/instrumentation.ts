export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.SKIP_DB_SCHEMA_HEAL === "1") return;
  // Jangan ALTER database saat `next build` (collecting static props / CI).
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { ensureProjectSchema } = await import("@/lib/ensure-project-schema");
  await ensureProjectSchema();
}
