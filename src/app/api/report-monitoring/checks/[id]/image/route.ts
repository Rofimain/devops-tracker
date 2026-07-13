import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canWriteAppData } from "@/lib/roles";
import { deleteReportMonitoringImage, readReportMonitoringImage } from "@/lib/report-monitoring-storage";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const check = await prisma.reportMonitoringCheck.findUnique({ where: { id: params.id } });
  if (!check?.imagePath) {
    return NextResponse.json({ error: "Gambar tidak ditemukan" }, { status: 404 });
  }

  try {
    const data = await readReportMonitoringImage(check.imagePath);
    const filename = check.imageName ?? "evidence.png";
    return new NextResponse(data, {
      headers: {
        "Content-Type": check.imageMime ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(filename)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Gambar tidak ditemukan di storage" }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canWriteAppData(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const check = await prisma.reportMonitoringCheck.findUnique({ where: { id: params.id } });
  if (!check) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deleteReportMonitoringImage(check.imagePath);
  const updated = await prisma.reportMonitoringCheck.update({
    where: { id: check.id },
    data: { imagePath: null, imageName: null, imageMime: null, imageSize: null },
  });

  return NextResponse.json(updated);
}
