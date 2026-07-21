import { z } from "zod";

export const DELETION_BASIS_OPTIONS = [
  { value: "SOP", label: "SOP" },
  { value: "AUDIT", label: "Audit" },
  { value: "BUSINESS_REQUEST", label: "Permintaan Bisnis" },
] as const;

export const YES_NO_OPTIONS = [
  { value: "YES", label: "Ya" },
  { value: "NO", label: "Tidak" },
] as const;

export const THIRD_PARTY_OPTIONS = [
  { value: "YES", label: "Ya" },
  { value: "NO", label: "Tidak" },
  { value: "NA", label: "N/A" },
] as const;

export const PROCESS_STATUS_OPTIONS = [
  { value: "REQUESTED", label: "Requested" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "DELETED", label: "Deleted" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "DECOMMISSIONED", label: "Decommissioned" },
  { value: "ARCHIVED", label: "Archived" },
  { value: "ON_HOLD", label: "On Hold" },
] as const;

export const FINAL_STATUS_OPTIONS = [
  { value: "OPEN", label: "Open" },
  { value: "CLOSED", label: "Closed" },
  { value: "REJECTED", label: "Rejected" },
] as const;

export const INFRA_SCOPE_HINT = "EC2, ALB, Target Group, DNS";
export const DATABASE_SCOPE_HINT = "RDS / Docker / All-in-one EC2";

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

const dateKey = z.preprocess(
  emptyToNull,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD")
    .nullable()
);

const optionalText = z.preprocess(
  emptyToNull,
  z.string().trim().max(5000).nullable()
);

const requiredText = z.string().trim().min(1, "Wajib diisi").max(500);

const optionalEnum = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(emptyToNull, schema.nullable());

export const webDecommissionUpsertSchema = z.object({
  requestChannel: requiredText,
  platformName: requiredText,
  domainUrl: requiredText,
  ownerRequester: requiredText,
  systemOwnerTeam: requiredText,
  deletionReason: optionalText,
  deletionBasis: z.enum(["SOP", "AUDIT", "BUSINESS_REQUEST"]),
  requestDate: dateKey,
  infraApproved: optionalEnum(z.enum(["YES", "NO"])),
  infraApprovedAt: dateKey,
  infraScope: optionalText,
  databaseScope: optionalText,
  thirdPartyIntegration: optionalEnum(z.enum(["YES", "NO", "NA"])),
  processStatus: z.enum([
    "REQUESTED",
    "IN_PROGRESS",
    "DELETED",
    "INACTIVE",
    "DECOMMISSIONED",
    "ARCHIVED",
    "ON_HOLD",
  ]),
  picInfra: optionalText,
  processStartedAt: dateKey,
  estimatedDoneAt: dateKey,
  completedAt: dateKey,
  evidenceLinks: optionalText,
  technicalNotes: optionalText,
  finalStatus: z.enum(["OPEN", "CLOSED", "REJECTED"]),
  auditNotes: optionalText,
});

export type WebDecommissionUpsertInput = z.infer<typeof webDecommissionUpsertSchema>;

export function labelForOption<T extends string>(
  options: readonly { value: T; label: string }[],
  value: T | null | undefined
) {
  if (!value) return "—";
  return options.find((o) => o.value === value)?.label ?? value;
}

export function dateKeyToUtcDate(key: string | null | undefined): Date | null {
  if (!key) return null;
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatDateDisplay(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function toDateInputValue(date: Date | string | null | undefined) {
  if (!date) return "";
  if (typeof date === "string") return date.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

/** Map validated payload ke data Prisma (Date fields). */
export function toPrismaWriteData(input: WebDecommissionUpsertInput) {
  return {
    requestChannel: input.requestChannel,
    platformName: input.platformName,
    domainUrl: input.domainUrl,
    ownerRequester: input.ownerRequester,
    systemOwnerTeam: input.systemOwnerTeam,
    deletionReason: input.deletionReason,
    deletionBasis: input.deletionBasis,
    requestDate: dateKeyToUtcDate(input.requestDate),
    infraApproved: input.infraApproved,
    infraApprovedAt: dateKeyToUtcDate(input.infraApprovedAt),
    infraScope: input.infraScope,
    databaseScope: input.databaseScope,
    thirdPartyIntegration: input.thirdPartyIntegration,
    processStatus: input.processStatus,
    picInfra: input.picInfra,
    processStartedAt: dateKeyToUtcDate(input.processStartedAt),
    estimatedDoneAt: dateKeyToUtcDate(input.estimatedDoneAt),
    completedAt: dateKeyToUtcDate(input.completedAt),
    evidenceLinks: input.evidenceLinks,
    technicalNotes: input.technicalNotes,
    finalStatus: input.finalStatus,
    auditNotes: input.auditNotes,
  };
}
