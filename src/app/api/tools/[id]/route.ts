import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tool = await prisma.tool.findUnique({
    where: { id: params.id },
    include: { projects: { include: { project: true } }, _count: { select: { projects: true } } },
  });
  if (!tool) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(tool);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const tool = await prisma.tool.update({
    where: { id: params.id },
    data: {
      name: body.name,
      category: body.category,
      version: body.version || null,
      description: body.description || null,
      docsUrl: body.docsUrl || null,
    },
  });
  return NextResponse.json(tool);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.projectTool.deleteMany({ where: { toolId: params.id } });
  await prisma.tool.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
