import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity-log";

export async function DELETE(req: NextRequest, { params }: { params: { id: string; toolId: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pt = await prisma.projectTool.findFirst({
    where: { id: params.toolId, projectId: params.id },
    include: { tool: { select: { name: true } } },
  });
  if (!pt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await recordActivity(req, {
    action: "REMOVE_PROJECT_TOOL",
    details: `Tool "${pt.tool.name}" dilepas dari project`,
    userId: session.user.id,
    projectId: params.id,
  });
  await prisma.projectTool.delete({ where: { id: params.toolId } });
  return NextResponse.json({ success: true });
}
