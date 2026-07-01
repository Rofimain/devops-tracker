import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { StorageServerType } from "@prisma/client";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity-log";
import { canViewStorage } from "@/lib/roles";
import { serializeStorageServer } from "@/lib/storage-monitor";
import { normalizeStorageServerInput } from "@/lib/storage-server-input";

const putSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  serverType: z.enum(["SYNOLOGY", "QNAP", "HTTP_JSON"]).optional(),
  host: z.string().max(255).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  useHttps: z.boolean().optional(),
  username: z.string().max(120).optional(),
  password: z.string().max(500).optional(),
  baseUrl: z.string().max(2000).optional(),
  apiUrl: z.string().max(2000).optional(),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewStorage(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const server = await prisma.storageServer.findUnique({ where: { id: params.id } });
  if (!server) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(serializeStorageServer(server));
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await prisma.storageServer.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const json = await req.json();
    const parsed = putSchema.safeParse(json);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const detail = first ? `${first.path.join(".")}: ${first.message}` : "Data tidak valid";
      return NextResponse.json({ error: detail }, { status: 400 });
    }

    const data = parsed.data;
    const normalized = normalizeStorageServerInput(
      {
        name: data.name ?? existing.name,
        serverType: (data.serverType ?? existing.serverType) as StorageServerType,
        host: data.host ?? existing.host,
        port: data.port ?? existing.port,
        useHttps: data.useHttps ?? existing.useHttps,
        username: data.username ?? existing.username,
        password: data.password,
        baseUrl: data.baseUrl ?? existing.baseUrl,
        apiUrl: data.apiUrl ?? existing.apiUrl,
        enabled: data.enabled ?? existing.enabled,
        sortOrder: data.sortOrder ?? existing.sortOrder,
        notes: data.notes !== undefined ? data.notes : existing.notes,
      },
      existing.password,
    );
    if (!normalized.ok) return NextResponse.json({ error: normalized.error }, { status: 400 });

    const server = await prisma.storageServer.update({
      where: { id: params.id },
      data: normalized.value,
    });

    await recordActivity(req, {
      action: "STORAGE_SERVER_UPDATE",
      details: `Server storage "${server.name}" diperbarui`,
      userId: session.user.id,
    });

    return NextResponse.json(serializeStorageServer(server));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await prisma.storageServer.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.storageServer.delete({ where: { id: params.id } });
  await recordActivity(req, {
    action: "STORAGE_SERVER_DELETE",
    details: `Server storage "${existing.name}" dihapus`,
    userId: session.user.id,
  });

  return NextResponse.json({ ok: true });
}
