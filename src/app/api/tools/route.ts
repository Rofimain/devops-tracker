import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tools = await prisma.tool.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { projects: true } } } });
  return NextResponse.json(tools);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const tool = await prisma.tool.create({
      data: { name: body.name, category: body.category, version: body.version || null, description: body.description || null, docsUrl: body.docsUrl || null },
    });
    return NextResponse.json(tool, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
