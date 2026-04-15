import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(date: Date | string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: id });
}

export function slugify(text: string) {
  return text.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "badge-green",
  MAINTENANCE: "badge-yellow",
  DEPRECATED: "badge-red",
  PLANNING: "badge-blue",
};

export const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  MAINTENANCE: "Maintenance",
  DEPRECATED: "Deprecated",
  PLANNING: "Planning",
};

export const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "badge-accent",
  ADMIN: "badge-purple",
  MEMBER: "badge-gray",
};

export const TOOL_CATEGORY_COLORS: Record<string, string> = {
  "CI/CD": "badge-purple",
  Container: "badge-blue",
  Monitoring: "badge-red",
  Database: "badge-green",
  "Web Server": "badge-gray",
  "CDN/DNS": "badge-yellow",
  SSL: "badge-blue",
  default: "badge-gray",
};
