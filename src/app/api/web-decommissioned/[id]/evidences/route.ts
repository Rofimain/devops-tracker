import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity-log";
import { canWriteWebDecommissioned } from "@/lib/roles";
import {
  MAX_IMAGE_BYTES,
  MAX_IMAGES_PER_UPLOAD,
  resolveUploadedImageType,
  saveWebDecommissionImage,
} from "@/lib/web-decommissioned-storage";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canWriteWebDecommissioned(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const record = await prisma.webDecommissionRecord.findUnique({
      where: { id: params.id },
      include: { evidences: { select: { id: true, sortOrder: true } } },
    });
    if (!record) return NextResponse.json({ error: "Record tidak ditemukan" }, { status: 404 });

    const formData = await req.formData();
    const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    const single = formData.get("file");
    if (single instanceof File && single.size > 0) files.push(single);

    if (files.length === 0) {
      return NextResponse.json({ error: "Tidak ada file gambar" }, { status: 400 });
    }
    if (files.length > MAX_IMAGES_PER_UPLOAD) {
      return NextResponse.json(
        { error: `Maksimal ${MAX_IMAGES_PER_UPLOAD} gambar per upload` },
        { status: 400 }
      );
    }

    let nextSort =
      record.evidences.reduce((max, e) => Math.max(max, e.sortOrder), -1) + 1;

    const created = [];
    for (const file of files) {
      if (file.size > MAX_IMAGE_BYTES) {
        return NextResponse.json(
          { error: `Gambar "${file.name}" melebihi 10 MB` },
          { status: 400 }
        );
      }
      const resolved = resolveUploadedImageType(file);
      if (!resolved) {
        return NextResponse.json(
          { error: `Format "${file.name}" tidak didukung (JPG, PNG, WEBP, GIF)` },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const saved = await saveWebDecommissionImage(params.id, buffer, resolved.ext);
      const evidence = await prisma.webDecommissionEvidence.create({
        data: {
          recordId: params.id,
          imagePath: saved.imagePath,
          imageName: file.name,
          imageMime: resolved.mime,
          imageSize: file.size,
          sortOrder: nextSort++,
        },
      });
      created.push(evidence);
    }

    await recordActivity(req, {
      action: "WEB_DECOMMISSION_EVIDENCE_UPLOAD",
      details: `Web Decommissioned: upload ${created.length} bukti untuk "${record.platformName}"`,
      userId: session.user.id,
    });

    return NextResponse.json({ evidences: created }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
