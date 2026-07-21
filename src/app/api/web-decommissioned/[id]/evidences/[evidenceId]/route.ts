import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity-log";
import { canWriteAppData } from "@/lib/roles";
import {
  deleteWebDecommissionImage,
  readWebDecommissionImage,
} from "@/lib/web-decommissioned-storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; evidenceId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const evidence = await prisma.webDecommissionEvidence.findFirst({
    where: { id: params.evidenceId, recordId: params.id },
  });
  if (!evidence) return NextResponse.json({ error: "Bukti tidak ditemukan" }, { status: 404 });

  try {
    const data = await readWebDecommissionImage(evidence.imagePath);
    return new NextResponse(data, {
      headers: {
        "Content-Type": evidence.imageMime,
        "Content-Length": String(evidence.imageSize),
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": `inline; filename="${evidence.imageName.replace(/"/g, "")}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; evidenceId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canWriteAppData(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const evidence = await prisma.webDecommissionEvidence.findFirst({
    where: { id: params.evidenceId, recordId: params.id },
    include: { record: { select: { platformName: true } } },
  });
  if (!evidence) return NextResponse.json({ error: "Bukti tidak ditemukan" }, { status: 404 });

  await deleteWebDecommissionImage(evidence.imagePath);
  await prisma.webDecommissionEvidence.delete({ where: { id: evidence.id } });

  await recordActivity(req, {
    action: "WEB_DECOMMISSION_EVIDENCE_DELETE",
    details: `Web Decommissioned: hapus bukti "${evidence.imageName}" dari "${evidence.record.platformName}"`,
    userId: session.user.id,
  });

  return NextResponse.json({ ok: true });
}
