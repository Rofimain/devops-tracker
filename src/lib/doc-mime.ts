import { DocContentType } from "@prisma/client";

const MAX_DOC_BYTES = 20 * 1024 * 1024;

const MIME_MAP: Record<string, { ext: string; contentType: DocContentType; mime: string }> = {
  "application/pdf": { ext: ".pdf", contentType: DocContentType.PDF, mime: "application/pdf" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    ext: ".docx",
    contentType: DocContentType.DOCX,
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
};

const EXT_MAP: Record<string, { ext: string; contentType: DocContentType; mime: string }> = {
  ".pdf": MIME_MAP["application/pdf"],
  ".docx": MIME_MAP["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
};

export { MAX_DOC_BYTES };

export function resolveUploadedDocType(file: File) {
  const byMime = MIME_MAP[file.type];
  if (byMime) return byMime;

  const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
  return EXT_MAP[ext] ?? null;
}

export function isFileDoc(contentType: DocContentType) {
  return contentType === DocContentType.PDF || contentType === DocContentType.DOCX;
}

export function formatFileSize(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
