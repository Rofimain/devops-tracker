import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity-log";
import { canWriteAppData } from "@/lib/roles";
import {
  toPrismaWriteData,
  webDecommissionUpsertSchema,
} from "@/lib/web-decommissioned";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const status = req.nextUrl.searchParams.get("status")?.trim() ?? "";
  const final = req.nextUrl.searchParams.get("final")?.trim() ?? "";

  const records = await prisma.webDecommissionRecord.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { platformName: { contains: q, mode: "insensitive" } },
                { domainUrl: { contains: q, mode: "insensitive" } },
                { ownerRequester: { contains: q, mode: "insensitive" } },
                { systemOwnerTeam: { contains: q, mode: "insensitive" } },
                { picInfra: { contains: q, mode: "insensitive" } },
              ],
            }
          : {},
        status ? { processStatus: status as never } : {},
        final ? { finalStatus: final as never } : {},
      ],
    },
    orderBy: [{ createdAt: "desc" }],
    include: {
      evidences: { select: { id: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canWriteAppData(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = webDecommissionUpsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data tidak valid" },
        { status: 400 }
      );
    }

    const record = await prisma.webDecommissionRecord.create({
      data: {
        ...toPrismaWriteData(parsed.data),
        createdById: session.user.id,
      },
      include: { evidences: true },
    });

    await recordActivity(req, {
      action: "WEB_DECOMMISSION_CREATE",
      details: `Web Decommissioned: buat "${record.platformName}" (${record.domainUrl})`,
      userId: session.user.id,
    });

    return NextResponse.json(record, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
