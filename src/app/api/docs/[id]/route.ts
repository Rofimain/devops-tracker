import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity-log";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const doc = await prisma.doc.update({
    where: { id: params.id },
    data: { title: body.title, content: body.content, category: body.category || null, tags: body.tags || [], projectId: body.projectId || null },
  });
  await recordActivity(req, {
    action: "UPDATE_DOC",
    details: `Dokumen "${doc.title}" diubah`,
    userId: session.user.id,
    projectId: doc.projectId,
  });
  return NextResponse.json(doc);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const existing = await prisma.doc.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await recordActivity(req, {
    action: "DELETE_DOC",
    details: `Dokumen "${existing.title}" dihapus`,
    userId: session.user.id,
    projectId: existing.projectId,
  });
  await prisma.doc.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
