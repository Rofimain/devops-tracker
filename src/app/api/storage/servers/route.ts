import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { StorageServerType } from "@prisma/client";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity-log";
import { canViewStorage } from "@/lib/roles";
import { serializeStorageServer, fetchStorageUsage } from "@/lib/storage-monitor";
import { normalizeStorageServerInput } from "@/lib/storage-server-input";

const bodySchema = z.object({
  name: z.string().min(1).max(120),
  serverType: z.enum(["SYNOLOGY", "HTTP_JSON"]),
  host: z.string().max(255).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  useHttps: z.boolean().optional(),
  username: z.string().max(120).optional(),
  password: z.string().max(500).optional(),
  baseUrl: z.string().max(2000).optional(),
  apiUrl: z.string().max(2000).optional(),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  notes: z.string().max(2000).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewStorage(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const servers = await prisma.storageServer.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(servers.map(serializeStorageServer));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });

    const normalized = normalizeStorageServerInput({
      ...parsed.data,
      serverType: parsed.data.serverType as StorageServerType,
      host: parsed.data.host ?? "",
    });
    if (!normalized.ok) return NextResponse.json({ error: normalized.error }, { status: 400 });

    const server = await prisma.storageServer.create({ data: normalized.value });

    await recordActivity(req, {
      action: "STORAGE_SERVER_CREATE",
      details: `Server storage "${server.name}" ditambahkan`,
      userId: session.user.id,
    });

    return NextResponse.json(serializeStorageServer(server), { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
