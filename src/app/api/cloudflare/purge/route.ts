import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canPurgeCloudflare } from "@/lib/roles";
import { sanitizePurgeBody } from "@/lib/cloudflare-purge";
import { recordActivity } from "@/lib/activity-log";

function purgeSummary(body: Record<string, string[]>) {
  return Object.entries(body)
    .map(([k, v]) => `${k}:${v.length}`)
    .join(", ");
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canPurgeCloudflare(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cfg = await prisma.cloudflareAppConfig.findUnique({ where: { id: "default" } });
  const zoneId = cfg?.zoneId?.trim();
  const apiToken = cfg?.apiToken?.trim();
  if (!zoneId || !apiToken) {
    return NextResponse.json(
      { error: "Zone ID dan API token belum diatur. Buka tab Konfigurasi (admin) di halaman purge." },
      { status: 503 }
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Body harus JSON valid" }, { status: 400 });
  }

  const body = sanitizePurgeBody(raw);
  if (!body) {
    return NextResponse.json(
      { error: "Body tidak valid. Gunakan salah satu: files, hosts, prefixes, tags (array string non-kosong)." },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as { success?: boolean; errors?: { message: string }[]; messages?: string[]; result?: unknown };
    const text = JSON.stringify(data, null, 2);

    if (!res.ok || !data.success) {
      const msg = data.errors?.map((e) => e.message).join("; ") || data.messages?.join("; ") || res.statusText;
      await recordActivity(req, {
        action: "CLOUDFLARE_PURGE_FAIL",
        details: `Purge gagal (${purgeSummary(body)}): ${msg || res.statusText}`.slice(0, 500),
        userId: session.user.id,
      });
      return NextResponse.json({ ok: false, status: res.status, message: msg || "Cloudflare error", body: text }, { status: 502 });
    }

    await recordActivity(req, {
      action: "CLOUDFLARE_PURGE",
      details: `Purge cache OK (${purgeSummary(body)})`,
      userId: session.user.id,
    });
    return NextResponse.json({ ok: true, status: res.status, body: text });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e.message ?? "Request failed" }, { status: 500 });
  }
}
