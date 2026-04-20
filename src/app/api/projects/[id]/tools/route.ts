import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity-log";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { toolId, version, notes } = await req.json();
    const pt = await prisma.projectTool.create({
      data: { projectId: params.id, toolId, version: version || null, notes: notes || null },
      include: { tool: true },
    });
    await recordActivity(req, {
      action: "ADD_TOOL",
      details: `Tool "${pt.tool.name}" ditambahkan ke project`,
      userId: session.user.id,
      projectId: params.id,
    });
    return NextResponse.json(pt, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Tool sudah ada di project ini." }, { status: 400 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
