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

export function isSuperAdminRole(role?: Role | string | null) {
  return roleStr(role) === "SUPER_ADMIN";
}
