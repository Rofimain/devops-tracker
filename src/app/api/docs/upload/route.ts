import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity-log";
import { MAX_DOC_BYTES, resolveUploadedDocType } from "@/lib/doc-mime";
import { saveDocUpload } from "@/lib/doc-storage";
import { DocContentType } from "@prisma/client";

function parseTags(raw: FormDataEntryValue | null) {
  if (!raw || typeof raw !== "string") return [] as string[];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

async function extractDocxPreviewHtml(buffer: Buffer) {
  const result = await mammoth.convertToHtml({ buffer });
  return result.value.trim();
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const title = String(formData.get("title") ?? "").trim();
    const category = String(formData.get("category") ?? "").trim();
    const projectId = String(formData.get("projectId") ?? "").trim();
    const tags = parseTags(formData.get("tags"));

    if (!title) return NextResponse.json({ error: "Title wajib diisi" }, { status: 400 });
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "File PDF atau DOCX wajib diupload" }, { status: 400 });
    }
    if (file.size > MAX_DOC_BYTES) {
      return NextResponse.json({ error: "File maksimal 20 MB" }, { status: 400 });
    }

    const resolved = resolveUploadedDocType(file);
    if (!resolved) {
      return NextResponse.json({ error: "Format tidak didukung. Gunakan PDF atau DOCX (.docx)." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let previewContent = "";

    if (resolved.contentType === DocContentType.DOCX) {
      try {
        previewContent = await extractDocxPreviewHtml(buffer);
      } catch {
        previewContent = "";
      }
    }

    const doc = await prisma.doc.create({
      data: {
        title,
        content: previewContent,
        contentType: resolved.contentType,
        fileName: file.name,
        mimeType: resolved.mime,
        fileSize: file.size,
        category: category || null,
        tags,
        projectId: projectId || null,
      },
    });

    const filePath = await saveDocUpload(doc.id, buffer, resolved.ext);
    const saved = await prisma.doc.update({
      where: { id: doc.id },
      data: { filePath },
    });

    await recordActivity(req, {
      action: "ADD_DOC",
      details: `Dokumen "${saved.title}" diupload (${resolved.contentType})`,
      userId: session.user.id,
      projectId: saved.projectId,
    });

    return NextResponse.json(saved, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Upload gagal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
