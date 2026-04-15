import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeCostPerMonth, slugify } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const projects = await prisma.project.findMany({ orderBy: { updatedAt: "desc" }, include: { _count: { select: { tools: true, docs: true } } } });
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const slug = body.slug || slugify(body.name);
    const project = await prisma.project.create({
      data: {
        name: body.name,
        slug,
        description: body.description || null,
        url: body.url || null,
        repoUrl: body.repoUrl || null,
        category: body.category || null,
        management: body.management || null,
        status: body.status || "ACTIVE",
        platform: body.platform || [],
        environment: body.environment || "production",
        serverIp: body.serverIp || null,
        targetGroup: body.targetGroup || null,
        loadBalancer: body.loadBalancer || null,
        hosting: body.hosting || [],
        cdn: body.cdn || [],
        databases: body.databases || [],
        webBasedApp: typeof body.webBasedApp === "string" && body.webBasedApp.trim() ? body.webBasedApp.trim() : "Yes",
        costPerMonth: normalizeCostPerMonth(body.costPerMonth),
        notes: body.notes || null,
      },
    });
    // Log activity
    await prisma.activity.create({
      data: { action: "CREATE", details: `Project "${project.name}" dibuat`, userId: session.user.id, projectId: project.id },
    });
    return NextResponse.json(project, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Slug sudah digunakan. Ganti nama project." }, { status: 400 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
