import { prisma } from "@/lib/prisma";

/**
 * Menyamakan tabel Project dengan schema Prisma saat ini jika migrasi
 * belum pernah dijalankan di DB (mis. deploy gagal / hanya db push lama).
 * Idempotent — aman dipanggil setiap cold start.
 */
export async function ensureProjectSchema(): Promise<void> {
  if (!process.env.DATABASE_URL) return;

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
  } catch (e) {
    console.error("[ensureProjectSchema] gagal menyelaraskan DB:", e);
  }
}
