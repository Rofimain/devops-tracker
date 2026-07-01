import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewStorage } from "@/lib/roles";
import { fetchAllStorageUsage } from "@/lib/storage-monitor";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canViewStorage(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const servers = await prisma.storageServer.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const results = await fetchAllStorageUsage(servers);
  return NextResponse.json({ servers: results, fetchedAt: new Date().toISOString() });
}
