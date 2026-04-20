import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity-log";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const docs = await prisma.doc.findMany({ orderBy: { updatedAt: "desc" }, include: { project: { select: { name: true, slug: true } } } });
  return NextResponse.json(docs);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const doc = await prisma.doc.create({
      data: { title: body.title, content: body.content, category: body.category || null, tags: body.tags || [], projectId: body.projectId || null },
    });
    await recordActivity(req, {
      action: "ADD_DOC",
      details: `Dokumen "${doc.title}" ditambahkan`,
      userId: session.user.id,
      projectId: body.projectId || null,
    });
    return NextResponse.json(doc, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
