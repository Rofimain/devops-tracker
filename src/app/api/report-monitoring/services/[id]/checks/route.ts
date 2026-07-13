import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity-log";
import { canWriteAppData } from "@/lib/roles";
import {
  dateKeyToUtcDate,
  isMonthApplicable,
  monthsForPeriod,
} from "@/lib/report-monitoring";
import {
  MAX_IMAGE_BYTES,
  deleteReportMonitoringImage,
  resolveUploadedImageType,
  saveReportMonitoringImage,
} from "@/lib/report-monitoring-storage";

function parseOptionalString(raw: FormDataEntryValue | null) {
  if (raw == null) return undefined;
  if (typeof raw !== "string") return undefined;
  return raw;
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canWriteAppData(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const service = await prisma.reportMonitoringService.findUnique({ where: { id: params.id } });
    if (!service) return NextResponse.json({ error: "Service tidak ditemukan" }, { status: 404 });

    const formData = await req.formData();
    const yearRaw = parseOptionalString(formData.get("year"));
    const monthRaw = parseOptionalString(formData.get("month"));
    const checkedAtRaw = parseOptionalString(formData.get("checkedAt"));
    const noteTextRaw = parseOptionalString(formData.get("noteText"));
    const clearImage = parseOptionalString(formData.get("clearImage")) === "true";
    const file = formData.get("file");

    const year = yearRaw ? Number.parseInt(yearRaw, 10) : NaN;
    const month = monthRaw ? Number.parseInt(monthRaw, 10) : NaN;

    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "Tahun tidak valid" }, { status: 400 });
    }
    if (!Number.isFinite(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Bulan tidak valid" }, { status: 400 });
    }
    if (!isMonthApplicable(service.period, month)) {
      return NextResponse.json(
        {
          error: `Bulan ${month} tidak sesuai period ${service.period}. Slot: ${monthsForPeriod(service.period).join(", ")}`,
        },
        { status: 400 },
      );
    }

    let checkedAt: Date | null | undefined = undefined;
    if (checkedAtRaw !== undefined) {
      if (checkedAtRaw === "" || checkedAtRaw === "null") {
        checkedAt = null;
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(checkedAtRaw)) {
        return NextResponse.json({ error: "Format tanggal harus YYYY-MM-DD" }, { status: 400 });
      } else {
        checkedAt = dateKeyToUtcDate(checkedAtRaw);
      }
    }

    const noteText =
      noteTextRaw === undefined ? undefined : noteTextRaw.trim() === "" ? null : noteTextRaw.trim().slice(0, 5000);

    const existing = await prisma.reportMonitoringCheck.findUnique({
      where: {
        serviceId_year_month: {
          serviceId: params.id,
          year,
          month,
        },
      },
    });

    let check = existing
      ? await prisma.reportMonitoringCheck.update({
          where: { id: existing.id },
          data: {
            ...(checkedAt !== undefined ? { checkedAt } : {}),
            ...(noteText !== undefined ? { noteText } : {}),
          },
        })
      : await prisma.reportMonitoringCheck.create({
          data: {
            serviceId: params.id,
            year,
            month,
            checkedAt: checkedAt ?? null,
            noteText: noteText ?? null,
          },
        });

    if (clearImage && check.imagePath) {
      await deleteReportMonitoringImage(check.imagePath);
      check = await prisma.reportMonitoringCheck.update({
        where: { id: check.id },
        data: { imagePath: null, imageName: null, imageMime: null, imageSize: null },
      });
    }

    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_IMAGE_BYTES) {
        return NextResponse.json({ error: "Gambar maksimal 10 MB" }, { status: 400 });
      }
      const resolved = resolveUploadedImageType(file);
      if (!resolved) {
        return NextResponse.json({ error: "Format gambar tidak didukung (JPG, PNG, WEBP, GIF)" }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      await deleteReportMonitoringImage(check.imagePath);
      const imagePath = await saveReportMonitoringImage(check.id, buffer, resolved.ext);
      check = await prisma.reportMonitoringCheck.update({
        where: { id: check.id },
        data: {
          imagePath,
          imageName: file.name,
          imageMime: resolved.mime,
          imageSize: file.size,
        },
      });
    }

    await recordActivity(req, {
      action: "REPORT_MONITORING_CHECK_UPSERT",
      details: `Report Monitoring: cek "${service.name}" ${year}-${String(month).padStart(2, "0")}`,
      userId: session.user.id,
    });

    return NextResponse.json(check);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
