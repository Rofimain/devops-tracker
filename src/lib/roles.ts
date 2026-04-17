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
