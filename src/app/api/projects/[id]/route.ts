import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeCostPerMonth } from "@/lib/utils";
import { parseInfrasFromBody } from "@/lib/project-infra";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      tools: { include: { tool: true } },
      docs: true,
      infras: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const infras = parseInfrasFromBody(body);
    await prisma.$transaction(async (tx) => {
      await tx.projectInfra.deleteMany({ where: { projectId: params.id } });
      await tx.project.update({
        where: { id: params.id },
        data: {
          name: body.name,
          slug: body.slug,
          description: body.description || null,
          url: body.url || null,
          repoUrl: body.repoUrl || null,
          category: body.category || null,
          management: body.management || null,
          status: body.status,
          platform: body.platform || [],
          webBasedApp: typeof body.webBasedApp === "string" && body.webBasedApp.trim() ? body.webBasedApp.trim() : "Yes",
          costPerMonth: normalizeCostPerMonth(body.costPerMonth),
          notes: body.notes || null,
        },
      });
      await tx.projectInfra.createMany({
        data: infras.map((row, i) => ({
          projectId: params.id,
          sortOrder: i,
          envName: row.envName,
          targetGroup: row.targetGroup.trim() || null,
          loadBalancer: row.loadBalancer.trim() || null,
          serverIp: row.serverIp.trim() || null,
          hosting: row.hosting,
          cdn: row.cdn,
          databases: row.databases,
        })),
      });
    });
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: { infras: { orderBy: { sortOrder: "asc" } } },
    });
    await prisma.activity.create({
      data: { action: "UPDATE", details: `Project "${project?.name}" diupdate`, userId: session.user.id, projectId: params.id },
    });
    return NextResponse.json(project);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.project.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
