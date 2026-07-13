import fs from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "report-monitoring");

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const MIME_MAP: Record<string, { ext: string; mime: string }> = {
  "image/jpeg": { ext: ".jpg", mime: "image/jpeg" },
  "image/png": { ext: ".png", mime: "image/png" },
  "image/webp": { ext: ".webp", mime: "image/webp" },
  "image/gif": { ext: ".gif", mime: "image/gif" },
};

const EXT_MAP: Record<string, { ext: string; mime: string }> = {
  ".jpg": MIME_MAP["image/jpeg"],
  ".jpeg": MIME_MAP["image/jpeg"],
  ".png": MIME_MAP["image/png"],
  ".webp": MIME_MAP["image/webp"],
  ".gif": MIME_MAP["image/gif"],
};

export { MAX_IMAGE_BYTES };

export async function ensureReportMonitoringUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export function reportMonitoringImageRelativePath(checkId: string, ext: string) {
  return path.join("uploads", "report-monitoring", `${checkId}${ext}`);
}

export function reportMonitoringImageAbsolutePath(checkId: string, ext: string) {
  return path.join(UPLOAD_DIR, `${checkId}${ext}`);
}

export function resolveUploadedImageType(file: File) {
  const byMime = MIME_MAP[file.type];
  if (byMime) return byMime;

  const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
  if (ext === ".jpeg") return EXT_MAP[".jpeg"];
  return EXT_MAP[ext] ?? null;
}

export async function saveReportMonitoringImage(checkId: string, data: Buffer, ext: string) {
  await ensureReportMonitoringUploadDir();
  const abs = reportMonitoringImageAbsolutePath(checkId, ext);
  await fs.writeFile(abs, data);
  return reportMonitoringImageRelativePath(checkId, ext);
}

export async function readReportMonitoringImage(relativePath: string) {
  return fs.readFile(path.join(process.cwd(), relativePath));
}

export async function deleteReportMonitoringImage(relativePath: string | null | undefined) {
  if (!relativePath) return;
  try {
    await fs.unlink(path.join(process.cwd(), relativePath));
  } catch {
    // ignore missing file
  }
}
