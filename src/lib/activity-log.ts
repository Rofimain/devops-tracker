import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export type RequestLike = Pick<NextRequest, "headers">;

export function clientIpFromRequest(req: RequestLike): string | null {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  const cf = req.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf.slice(0, 64);
  return null;
}

export function userAgentFromRequest(req: RequestLike): string | null {
  const ua = req.headers.get("user-agent");
  if (!ua) return null;
  return ua.slice(0, 512);
}

export async function recordActivity(
  req: RequestLike | null | undefined,
  data: {
    action: string;
    details?: string | null;
    userId?: string | null;
    projectId?: string | null;
  },
) {
  const ipAddress = req ? clientIpFromRequest(req) : null;
  const userAgent = req ? userAgentFromRequest(req) : null;
  return prisma.activity.create({
    data: {
      action: data.action,
      details: data.details ?? null,
      userId: data.userId ?? null,
      projectId: data.projectId ?? null,
      ipAddress,
      userAgent,
    },
  });
}
