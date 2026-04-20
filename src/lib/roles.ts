import { Role } from "@prisma/client";

export function canPurgeCloudflare(role?: Role | string | null) {
  return role === Role.SUPER_ADMIN || role === Role.ADMIN || role === Role.OPERATOR;
}

export function isOperatorRole(role?: Role | string | null) {
  return role === Role.OPERATOR;
}

export function isAdminRole(role?: Role | string | null) {
  return role === Role.SUPER_ADMIN || role === Role.ADMIN;
}

export function isMemberRole(role?: Role | string | null) {
  return role === Role.MEMBER;
}

/** Project / tools / docs / logbook / settings (bukan purge). */
export function canWriteAppData(role?: Role | string | null) {
  return role === Role.SUPER_ADMIN || role === Role.ADMIN;
}

export function isSuperAdminRole(role?: Role | string | null) {
  return role === Role.SUPER_ADMIN;
}
