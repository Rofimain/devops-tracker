import fs from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "docs");

export async function ensureDocUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export function docUploadAbsolutePath(docId: string, ext: string) {
  return path.join(UPLOAD_DIR, `${docId}${ext}`);
}

export function docUploadRelativePath(docId: string, ext: string) {
  return path.join("uploads", "docs", `${docId}${ext}`);
}

export async function saveDocUpload(docId: string, data: Buffer, ext: string) {
  await ensureDocUploadDir();
  const abs = docUploadAbsolutePath(docId, ext);
  await fs.writeFile(abs, data);
  return docUploadRelativePath(docId, ext);
}

export async function readDocUpload(relativePath: string) {
  return fs.readFile(path.join(process.cwd(), relativePath));
}

export async function deleteDocUpload(relativePath: string | null | undefined) {
  if (!relativePath) return;
  try {
    await fs.unlink(path.join(process.cwd(), relativePath));
  } catch {
    // ignore missing file
  }
}
