import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "web-decommissioned");

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGES_PER_UPLOAD = 20;

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

export { MAX_IMAGE_BYTES, MAX_IMAGES_PER_UPLOAD };

export async function ensureWebDecommissionUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export function webDecommissionImageRelativePath(recordId: string, fileId: string, ext: string) {
  return path.join("uploads", "web-decommissioned", recordId, `${fileId}${ext}`);
}

export function webDecommissionImageAbsolutePath(recordId: string, fileId: string, ext: string) {
  return path.join(UPLOAD_DIR, recordId, `${fileId}${ext}`);
}

export function resolveUploadedImageType(file: File) {
  const byMime = MIME_MAP[file.type];
  if (byMime) return byMime;

  const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
  if (ext === ".jpeg") return EXT_MAP[".jpeg"];
  return EXT_MAP[ext] ?? null;
}

export async function saveWebDecommissionImage(recordId: string, data: Buffer, ext: string) {
  await ensureWebDecommissionUploadDir();
  const fileId = randomUUID();
  const absDir = path.join(UPLOAD_DIR, recordId);
  await fs.mkdir(absDir, { recursive: true });
  const abs = webDecommissionImageAbsolutePath(recordId, fileId, ext);
  await fs.writeFile(abs, data);
  return {
    fileId,
    imagePath: webDecommissionImageRelativePath(recordId, fileId, ext),
  };
}

export async function readWebDecommissionImage(relativePath: string) {
  return fs.readFile(path.join(process.cwd(), relativePath));
}

export async function deleteWebDecommissionImage(relativePath: string | null | undefined) {
  if (!relativePath) return;
  try {
    await fs.unlink(path.join(process.cwd(), relativePath));
  } catch {
    // ignore missing file
  }
}

export async function deleteWebDecommissionRecordDir(recordId: string) {
  try {
    await fs.rm(path.join(UPLOAD_DIR, recordId), { recursive: true, force: true });
  } catch {
    // ignore
  }
}
