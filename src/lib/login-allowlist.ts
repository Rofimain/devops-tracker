import { prisma } from "@/lib/prisma";

const SUPER = () => (process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();

/** Normalisasi email untuk allowlist & OAuth. */
export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/**
 * Jika daftar undangan kosong: cukup domain (mode lama / dev).
 * Jika daftar undangan berisi email: boleh login jika (a) ada di undangan, atau (b) sudah punya akun User
 *     dengan email yang sama — supaya anggota tim yang sudah terdaftar tidak terkunci setelah undangan diaktifkan.
 *     Orang baru dengan domain saja (tanpa undangan & belum pernah login) tetap ditolak.
 */
export async function isEmailAllowedForSignIn(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;

  const superEmail = SUPER();
  if (superEmail && normalized === superEmail) return true;

  const total = await prisma.loginAllowlist.count();
  if (total === 0) return true;

  const row = await prisma.loginAllowlist.findUnique({ where: { email: normalized } });
  if (row) return true;

  const existingUser = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true },
  });
  return Boolean(existingUser);
}
