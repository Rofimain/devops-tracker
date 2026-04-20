import { prisma } from "@/lib/prisma";

const SUPER = () => (process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();

/** Normalisasi email untuk allowlist & OAuth. */
export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/**
 * Jika ada minimal satu baris LoginAllowlist: hanya email di tabel (+ super admin env) yang boleh login.
 * Jika tabel kosong: hanya pengecekan domain (perilaku lama / dev).
 */
export async function isEmailAllowedForSignIn(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;

  const superEmail = SUPER();
  if (superEmail && normalized === superEmail) return true;

  const total = await prisma.loginAllowlist.count();
  if (total === 0) return true;

  const row = await prisma.loginAllowlist.findUnique({ where: { email: normalized } });
  return Boolean(row);
}
