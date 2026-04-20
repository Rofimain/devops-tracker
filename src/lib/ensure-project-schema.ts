import { prisma } from "@/lib/prisma";

/**
 * Menyamakan tabel Project dengan schema Prisma saat ini jika migrasi
 * belum pernah dijalankan di DB (mis. deploy gagal / hanya db push lama).
 * Idempotent — aman dipanggil setiap cold start.
 */
export async function ensureProjectSchema(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  try {
    const webBasedRows = await prisma.$queryRaw<[{ exists: boolean }]>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Project' AND column_name = 'webBasedApp'
      ) AS "exists"
    `;
    const webBasedExists = Boolean(webBasedRows[0]?.exists);

    const isWebRows = await prisma.$queryRaw<[{ exists: boolean }]>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Project' AND column_name = 'isWebApp'
      ) AS "exists"
    `;
    const isWebAppExists = Boolean(isWebRows[0]?.exists);

    if (!webBasedExists) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "webBasedApp" TEXT;`);
      if (isWebAppExists) {
        await prisma.$executeRawUnsafe(`
          UPDATE "Project" SET "webBasedApp" = CASE WHEN "isWebApp" IS TRUE THEN 'Yes' ELSE 'No' END
          WHERE "webBasedApp" IS NULL;
        `);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Project" DROP COLUMN IF EXISTS "isWebApp";`);
      } else {
        await prisma.$executeRawUnsafe(`UPDATE "Project" SET "webBasedApp" = 'Yes' WHERE "webBasedApp" IS NULL;`);
      }
      await prisma.$executeRawUnsafe(`ALTER TABLE "Project" ALTER COLUMN "webBasedApp" SET DEFAULT 'Yes';`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "Project" ALTER COLUMN "webBasedApp" SET NOT NULL;`);
    } else if (isWebAppExists) {
      await prisma.$executeRawUnsafe(`
        UPDATE "Project" SET "webBasedApp" = CASE WHEN "isWebApp" IS TRUE THEN 'Yes' ELSE 'No' END
        WHERE "webBasedApp" IS NULL OR trim("webBasedApp") = '';
      `);
      await prisma.$executeRawUnsafe(`ALTER TABLE "Project" DROP COLUMN IF EXISTS "isWebApp";`);
    }

    const statusRows = await prisma.$queryRaw<[{ udt_name: string | null }]>`
      SELECT udt_name::text AS udt_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Project' AND column_name = 'status'
    `;
    const statusUdt = statusRows[0]?.udt_name ?? null;

    if (statusUdt === "ProjectStatus") {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Project" ALTER COLUMN "status" DROP DEFAULT;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "Project" ALTER COLUMN "status" TYPE TEXT USING ("status"::text);`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "Project" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';`);
      await prisma.$executeRawUnsafe(`DROP TYPE IF EXISTS "ProjectStatus";`);
    }

    const costRows = await prisma.$queryRaw<[{ data_type: string | null }]>`
      SELECT data_type::text AS data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Project' AND column_name = 'costPerMonth'
    `;
    const costType = costRows[0]?.data_type?.toLowerCase() ?? null;

    if (costType && !["text", "character varying"].includes(costType)) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Project" ALTER COLUMN "costPerMonth" DROP DEFAULT;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "Project" ALTER COLUMN "costPerMonth" TYPE TEXT USING ("costPerMonth"::text);`);
    }

    await ensureProjectInfraTableAndRows();
    await ensureLogbookTable();
    await ensureLogbookOccurredAtColumn();
    await ensureCloudflareTables();
    await ensureLoginAllowlistTable();
    await ensureActivityAuditColumns();
    await ensureLoginAllowlistInvitedRoleColumn();
  } catch (e) {
    console.error("[ensureProjectSchema] gagal menyelaraskan DB:", e);
  }
}

/** Tabel LogbookEntry (jika migrasi belum dijalankan di server produksi). */
async function ensureLogbookTable(): Promise<void> {
  const tableExistsRows = await prisma.$queryRaw<[{ exists: boolean }]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'LogbookEntry'
    ) AS "exists"
  `;
  if (Boolean(tableExistsRows[0]?.exists)) return;

  await prisma.$executeRawUnsafe(`
CREATE TABLE IF NOT EXISTS "LogbookEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isoYear" INTEGER NOT NULL,
    "isoWeek" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LogbookEntry_pkey" PRIMARY KEY ("id")
);
`);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "LogbookEntry_isoYear_isoWeek_idx" ON "LogbookEntry"("isoYear", "isoWeek");`
  );
  await prisma.$executeRawUnsafe(`ALTER TABLE "LogbookEntry" DROP CONSTRAINT IF EXISTS "LogbookEntry_userId_fkey";`);
  await prisma.$executeRawUnsafe(`
ALTER TABLE "LogbookEntry" ADD CONSTRAINT "LogbookEntry_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
`);
}

async function ensureLogbookOccurredAtColumn(): Promise<void> {
  const tableExistsRows = await prisma.$queryRaw<[{ exists: boolean }]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'LogbookEntry'
    ) AS "exists"
  `;
  if (!Boolean(tableExistsRows[0]?.exists)) return;

  const colRows = await prisma.$queryRaw<[{ exists: boolean }]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'LogbookEntry' AND column_name = 'occurredAt'
    ) AS "exists"
  `;
  if (Boolean(colRows[0]?.exists)) return;

  await prisma.$executeRawUnsafe(`ALTER TABLE "LogbookEntry" ADD COLUMN "occurredAt" TIMESTAMP(3);`);
  await prisma.$executeRawUnsafe(`UPDATE "LogbookEntry" SET "occurredAt" = "createdAt" WHERE "occurredAt" IS NULL;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "LogbookEntry" ALTER COLUMN "occurredAt" SET DEFAULT CURRENT_TIMESTAMP;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "LogbookEntry" ALTER COLUMN "occurredAt" SET NOT NULL;`);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "LogbookEntry_occurredAt_idx" ON "LogbookEntry"("occurredAt");`
  );
}

async function ensureLoginAllowlistTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`
CREATE TABLE IF NOT EXISTS "LoginAllowlist" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "note" TEXT,
    "invitedRole" "Role" NOT NULL DEFAULT 'MEMBER',
    "invitedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoginAllowlist_pkey" PRIMARY KEY ("id")
);
`);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "LoginAllowlist_email_key" ON "LoginAllowlist"("email");`
  );
  await prisma.$executeRawUnsafe(`ALTER TABLE "LoginAllowlist" DROP CONSTRAINT IF EXISTS "LoginAllowlist_invitedById_fkey";`);
  await prisma.$executeRawUnsafe(`
ALTER TABLE "LoginAllowlist" ADD CONSTRAINT "LoginAllowlist_invitedById_fkey"
  FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
`);
}

async function ensureActivityAuditColumns(): Promise<void> {
  const tableExistsRows = await prisma.$queryRaw<[{ exists: boolean }]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'Activity'
    ) AS "exists"
  `;
  if (!Boolean(tableExistsRows[0]?.exists)) return;

  const ipRows = await prisma.$queryRaw<[{ exists: boolean }]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Activity' AND column_name = 'ipAddress'
    ) AS "exists"
  `;
  if (!Boolean(ipRows[0]?.exists)) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Activity" ADD COLUMN "ipAddress" VARCHAR(64);`);
  }
  const uaRows = await prisma.$queryRaw<[{ exists: boolean }]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Activity' AND column_name = 'userAgent'
    ) AS "exists"
  `;
  if (!Boolean(uaRows[0]?.exists)) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Activity" ADD COLUMN "userAgent" VARCHAR(512);`);
  }
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Activity_createdAt_idx" ON "Activity"("createdAt");`);
}

async function ensureLoginAllowlistInvitedRoleColumn(): Promise<void> {
  const tableExistsRows = await prisma.$queryRaw<[{ exists: boolean }]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'LoginAllowlist'
    ) AS "exists"
  `;
  if (!Boolean(tableExistsRows[0]?.exists)) return;

  const colRows = await prisma.$queryRaw<[{ exists: boolean }]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'LoginAllowlist' AND column_name = 'invitedRole'
    ) AS "exists"
  `;
  if (Boolean(colRows[0]?.exists)) return;

  await prisma.$executeRawUnsafe(`ALTER TABLE "LoginAllowlist" ADD COLUMN "invitedRole" "Role" NOT NULL DEFAULT 'MEMBER';`);
}

async function ensureCloudflareTables(): Promise<void> {
  await prisma.$executeRawUnsafe(`
CREATE TABLE IF NOT EXISTS "CloudflareAppConfig" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL DEFAULT '',
    "apiToken" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CloudflareAppConfig_pkey" PRIMARY KEY ("id")
);
`);
  await prisma.$executeRawUnsafe(`
INSERT INTO "CloudflareAppConfig" ("id", "zoneId", "apiToken", "updatedAt")
VALUES ('default', '', '', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
`);
  await prisma.$executeRawUnsafe(`
CREATE TABLE IF NOT EXISTS "PurgePreset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bodyJson" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PurgePreset_pkey" PRIMARY KEY ("id")
);
`);
}

/** Tabel ProjectInfra + baris per project (sering ketinggalan jika migrate deploy gagal). */
async function ensureProjectInfraTableAndRows(): Promise<void> {
  const tableExistsRows = await prisma.$queryRaw<[{ exists: boolean }]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'ProjectInfra'
    ) AS "exists"
  `;
  const tableExists = Boolean(tableExistsRows[0]?.exists);

  if (!tableExists) {
    await prisma.$executeRawUnsafe(`
CREATE TABLE IF NOT EXISTS "ProjectInfra" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "envName" TEXT NOT NULL,
    "targetGroup" TEXT,
    "loadBalancer" TEXT,
    "serverIp" TEXT,
    "hosting" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cdn" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "databases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    CONSTRAINT "ProjectInfra_pkey" PRIMARY KEY ("id")
);
`);
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "ProjectInfra_projectId_envName_key" ON "ProjectInfra"("projectId", "envName");`
    );
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ProjectInfra_projectId_idx" ON "ProjectInfra"("projectId");`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "ProjectInfra" DROP CONSTRAINT IF EXISTS "ProjectInfra_projectId_fkey";`);
    await prisma.$executeRawUnsafe(`
ALTER TABLE "ProjectInfra" ADD CONSTRAINT "ProjectInfra_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
`);

    const legacyEnv = await prisma.$queryRaw<[{ exists: boolean }]>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Project' AND column_name = 'environment'
      ) AS "exists"
    `;

    if (legacyEnv[0]?.exists) {
      await prisma.$executeRawUnsafe(`
INSERT INTO "ProjectInfra" ("id", "projectId", "sortOrder", "envName", "targetGroup", "loadBalancer", "serverIp", "hosting", "cdn", "databases")
SELECT
  gen_random_uuid()::text,
  "id",
  0,
  COALESCE(NULLIF(trim("environment"), ''), 'production'),
  "targetGroup",
  "loadBalancer",
  "serverIp",
  COALESCE("hosting", ARRAY[]::TEXT[]),
  COALESCE("cdn", ARRAY[]::TEXT[]),
  COALESCE("databases", ARRAY[]::TEXT[])
FROM "Project";
`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "Project" DROP COLUMN IF EXISTS "environment";`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "Project" DROP COLUMN IF EXISTS "serverIp";`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "Project" DROP COLUMN IF EXISTS "targetGroup";`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "Project" DROP COLUMN IF EXISTS "loadBalancer";`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "Project" DROP COLUMN IF EXISTS "hosting";`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "Project" DROP COLUMN IF EXISTS "cdn";`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "Project" DROP COLUMN IF EXISTS "databases";`);
    }
  }

  const backfillRows = await prisma.$queryRaw<[{ projects: bigint; infras: bigint }]>`
    SELECT
      (SELECT COUNT(*)::bigint FROM "Project") AS projects,
      (SELECT COUNT(*)::bigint FROM "ProjectInfra") AS infras
  `;
  const nProj = Number(backfillRows[0]?.projects ?? 0);
  const nInf = Number(backfillRows[0]?.infras ?? 0);
  if (nProj > 0 && nInf === 0) {
    await prisma.$executeRawUnsafe(`
INSERT INTO "ProjectInfra" ("id", "projectId", "sortOrder", "envName", "targetGroup", "loadBalancer", "serverIp", "hosting", "cdn", "databases")
SELECT
  gen_random_uuid()::text,
  p."id",
  0,
  'production',
  NULL,
  NULL,
  NULL,
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[]
FROM "Project" p
WHERE NOT EXISTS (SELECT 1 FROM "ProjectInfra" x WHERE x."projectId" = p."id");
`);
  }
}
