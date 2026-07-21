import { Role } from "@prisma/client";

/** JWT / session kadang mengirim enum Prisma sebagai string biasa — bandingkan lewat string. */
function roleStr(role?: Role | string | null) {
  if (role == null || role === "") return "";
  return String(role);
}

export function canPurgeCloudflare(role?: Role | string | null) {
  const r = roleStr(role);
  return r === "SUPER_ADMIN" || r === "ADMIN" || r === "OPERATOR";
}

export function isOperatorRole(role?: Role | string | null) {
  return roleStr(role) === "OPERATOR";
}

export function isStorageMonitorRole(role?: Role | string | null) {
  return roleStr(role) === "STORAGE_MONITOR";
}

/** Role dengan navigasi terbatas (bukan portal penuh). */
export function isLimitedNavRole(role?: Role | string | null) {
  return isOperatorRole(role) || isStorageMonitorRole(role);
}

export function defaultHomePathForRole(role?: Role | string | null) {
  if (isOperatorRole(role)) return "/purge";
  if (isStorageMonitorRole(role)) return "/storage";
  return "/";
}

export function isAdminRole(role?: Role | string | null) {
  const r = roleStr(role);
  return r === "SUPER_ADMIN" || r === "ADMIN";
}

export function isMemberRole(role?: Role | string | null) {
  return roleStr(role) === "MEMBER";
}

/** Project / tools / docs / logbook / settings (bukan purge). */
export function canWriteAppData(role?: Role | string | null) {
  const r = roleStr(role);
  return r === "SUPER_ADMIN" || r === "ADMIN";
}

/**
 * Dokumentasi Web Decommissioned diisi PIC Infra / tim — Member ikut boleh tulis.
 * Report Monitoring & data inti lain tetap canWriteAppData (Admin only).
 */
export function canWriteWebDecommissioned(role?: Role | string | null) {
  const r = roleStr(role);
  return r === "SUPER_ADMIN" || r === "ADMIN" || r === "MEMBER";
}

export function isSuperAdminRole(role?: Role | string | null) {
  return roleStr(role) === "SUPER_ADMIN";
}

/** Host/port/URL kredensial storage — hanya Super Admin & Admin. */
export function canViewStorageEndpoints(role?: Role | string | null) {
  return isAdminRole(role);
}

/** Storage monitor — Super Admin, Admin, Member, atau role khusus STORAGE_MONITOR (bukan Operator). */
export function canViewStorage(role?: Role | string | null) {
  const r = roleStr(role);
  return r === "SUPER_ADMIN" || r === "ADMIN" || r === "MEMBER" || r === "STORAGE_MONITOR";
}
