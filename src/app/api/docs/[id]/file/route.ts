import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isFileDoc } from "@/lib/doc-mime";
import { deleteDocUpload, readDocUpload } from "@/lib/doc-storage";
import { DocContentType } from "@prisma/client";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await prisma.doc.findUnique({ where: { id: params.id } });
  if (!doc || !doc.filePath || !isFileDoc(doc.contentType)) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  }

  try {
    const data = await readDocUpload(doc.filePath);
    const filename = doc.fileName ?? `document${doc.contentType === DocContentType.PDF ? ".pdf" : ".docx"}`;
    return new NextResponse(data, {
      headers: {
        "Content-Type": doc.mimeType ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(filename)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "File tidak ditemukan di storage" }, { status: 404 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.doc.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "File wajib diupload" }, { status: 400 });
    }

    const { MAX_DOC_BYTES, resolveUploadedDocType } = await import("@/lib/doc-mime");
    if (file.size > MAX_DOC_BYTES) {
      return NextResponse.json({ error: "File maksimal 20 MB" }, { status: 400 });
    }

    const resolved = resolveUploadedDocType(file);
    if (!resolved) {
      return NextResponse.json({ error: "Format tidak didukung. Gunakan PDF atau DOCX (.docx)." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let previewContent = existing.content;

    if (resolved.contentType === DocContentType.DOCX) {
      try {
        previewContent = (await mammoth.convertToHtml({ buffer })).value.trim();
      } catch {
        previewContent = "";
      }
    } else {
      previewContent = "";
    }

    await deleteDocUpload(existing.filePath);
    const { saveDocUpload } = await import("@/lib/doc-storage");
    const filePath = await saveDocUpload(existing.id, buffer, resolved.ext);

    const doc = await prisma.doc.update({
      where: { id: existing.id },
      data: {
        contentType: resolved.contentType,
        fileName: file.name,
        filePath,
        mimeType: resolved.mime,
        fileSize: file.size,
        content: previewContent,
      },
    });

    return NextResponse.json(doc);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Gagal mengganti file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
