import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { StorageServerType } from "@prisma/client";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchStorageUsage } from "@/lib/storage-monitor";
import { normalizeStorageServerInput } from "@/lib/storage-server-input";

const testSchema = z.object({
  serverId: z.string().optional(),
  name: z.string().max(120).optional(),
  serverType: z.enum(["SYNOLOGY", "QNAP", "HTTP_JSON"]),
  host: z.string().max(255).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  useHttps: z.boolean().optional(),
  username: z.string().max(120).optional(),
  password: z.string().max(500).optional(),
  baseUrl: z.string().max(2000).optional(),
  apiUrl: z.string().max(2000).optional(),
});

export const dynamic = "force-dynamic";

/** Uji koneksi ke NAS/storage tanpa menyimpan (Admin/Super Admin). */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const json = await req.json();
    const parsed = testSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });

    const data = parsed.data;
    let password = data.password ?? "";
    if (!password.trim() && data.serverId) {
      const existing = await prisma.storageServer.findUnique({ where: { id: data.serverId } });
      if (existing) password = existing.password;
    }

    const normalized = normalizeStorageServerInput({
      name: data.name?.trim() || "Test",
      serverType: data.serverType as StorageServerType,
      host: data.host ?? "",
      port: data.port,
      useHttps: data.useHttps,
      username: data.username,
      password,
      baseUrl: data.baseUrl,
      apiUrl: data.apiUrl,
      enabled: true,
    });
    if (!normalized.ok) return NextResponse.json({ error: normalized.error }, { status: 400 });

    const result = await fetchStorageUsage({
      id: "test",
      ...normalized.value,
      sortOrder: 0,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
