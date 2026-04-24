import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity-log";
import { canPurgeCloudflare } from "@/lib/roles";

const postSchema = z.object({
  name: z.string().min(1).max(120),
  zoneId: z.string().max(200).optional(),
  bodyJson: z.string().min(2).max(10000),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canPurgeCloudflare(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const presets = await prisma.purgePreset.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(presets);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const json = await req.json();
    const parsed = postSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

    let bodyObj: unknown;
    try {
      bodyObj = JSON.parse(parsed.data.bodyJson);
    } catch {
      return NextResponse.json({ error: "bodyJson harus JSON valid" }, { status: 400 });
    }
    if (!bodyObj || typeof bodyObj !== "object") {
      return NextResponse.json({ error: "bodyJson harus object JSON" }, { status: 400 });
    }

    const preset = await prisma.purgePreset.create({
      data: {
        name: parsed.data.name.trim(),
        zoneId: (parsed.data.zoneId ?? "").trim(),
        bodyJson: parsed.data.bodyJson.trim(),
        sortOrder: parsed.data.sortOrder ?? 0,
      },
    });
    await recordActivity(req, {
      action: "PURGE_PRESET_CREATE",
      details: `Preset purge "${preset.name}" dibuat`,
      userId: session.user.id,
    });
    return NextResponse.json(preset, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Error" }, { status: 500 });
  }
}
