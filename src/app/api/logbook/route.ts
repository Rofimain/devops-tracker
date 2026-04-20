import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity-log";
import { parseWeekParam } from "@/lib/logbook-week";

const createSchema = z.object({
  isoYear: z.number().int().min(2000).max(2100),
  isoWeek: z.number().int().min(1).max(53),
  category: z.enum(["deployment", "change", "incident", "maintenance", "note"]),
  title: z.string().min(1).max(200),
  body: z.string().max(20000),
  /** ISO 8601 dari tanggal+waktu lokal. Opsional: default sekarang. */
  occurredAt: z.coerce.date().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const week = req.nextUrl.searchParams.get("week");
  const { isoYear, isoWeek } = parseWeekParam(week);

  const entries = await prisma.logbookEntry.findMany({
    where: { isoYear, isoWeek },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { occurredAt: "desc" },
  });
  return NextResponse.json({ isoYear, isoWeek, entries });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const json = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const occurredAt = parsed.data.occurredAt ?? new Date();

    const entry = await prisma.logbookEntry.create({
      data: {
        userId: session.user.id,
        isoYear: parsed.data.isoYear,
        isoWeek: parsed.data.isoWeek,
        category: parsed.data.category,
        title: parsed.data.title.trim(),
        body: parsed.data.body.trim(),
        occurredAt,
      },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
    });
    await recordActivity(req, {
      action: "LOGBOOK_CREATE",
      details: `Logbook: "${entry.title}" (W${parsed.data.isoWeek}/${parsed.data.isoYear})`,
      userId: session.user.id,
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Error" }, { status: 500 });
  }
}
