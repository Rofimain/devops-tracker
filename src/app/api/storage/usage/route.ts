import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewStorage, canViewStorageEndpoints } from "@/lib/roles";
import { fetchAllStorageUsage, sanitizeStorageUsageResult } from "@/lib/storage-monitor";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewStorage(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const servers = await prisma.storageServer.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const results = await fetchAllStorageUsage(servers);
  const redact = !canViewStorageEndpoints(session.user.role);
  return NextResponse.json({
    servers: results.map((r) => sanitizeStorageUsageResult(r, redact)),
    fetchedAt: new Date().toISOString(),
  });
}
