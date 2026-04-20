import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { auth, isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/login-allowlist";
import { recordActivity } from "@/lib/activity-log";

const inviteRoleSchema = z.enum(["MEMBER", "ADMIN", "OPERATOR"]);

const postSchema = z.object({
  email: z.string().email(),
  note: z.string().max(500).optional(),
  invitedRole: inviteRoleSchema.optional(),
});

export async function GET() {
  const session = await auth();
  if (!isSuperAdmin(session?.user?.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await prisma.loginAllowlist.findMany({
    orderBy: { createdAt: "desc" },
    include: { invitedBy: { select: { name: true, email: true } } },
  });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!isSuperAdmin(session?.user?.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const json = await req.json();
    const parsed = postSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "Email tidak valid" }, { status: 400 });

    const email = normalizeEmail(parsed.data.email);
    const domain = process.env.ALLOWED_EMAIL_DOMAIN ?? "";
    if (domain && !email.endsWith(`@${domain.toLowerCase()}`)) {
      return NextResponse.json({ error: `Email harus @${domain}` }, { status: 400 });
    }

    const invitedRole = parsed.data.invitedRole ?? Role.MEMBER;
    const row = await prisma.loginAllowlist.create({
      data: {
        email,
        note: parsed.data.note?.trim() || null,
        invitedRole,
        invitedById: session!.user.id,
      },
      include: { invitedBy: { select: { name: true, email: true } } },
    });
    await recordActivity(req, {
      action: "INVITE_ALLOWLIST",
      details: `Undangan login: ${email} (role ${invitedRole})`,
      userId: session!.user.id,
    });
    return NextResponse.json(row, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Email sudah ada di daftar" }, { status: 400 });
    return NextResponse.json({ error: e.message ?? "Error" }, { status: 500 });
  }
}
