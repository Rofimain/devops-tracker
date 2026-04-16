import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeCostPerMonth } from "@/lib/utils";
import { parseInfrasFromBody } from "@/lib/project-infra";

function parseIdArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x)).filter(Boolean);
}

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
    const toolIds = parseIdArray(body.toolIds);
    const docIds = parseIdArray(body.docIds);

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

      await tx.projectTool.deleteMany({ where: { projectId: params.id } });
      if (toolIds.length) {
        await tx.projectTool.createMany({
          data: toolIds.map((toolId) => ({ projectId: params.id, toolId })),
          skipDuplicates: true,
        });
      }

      await tx.doc.updateMany({
        where: { projectId: params.id },
        data: { projectId: null },
      });
      if (docIds.length) {
        await tx.doc.updateMany({
          where: { id: { in: docIds } },
          data: { projectId: params.id },
        });
      }
    });

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        infras: { orderBy: { sortOrder: "asc" } },
        tools: { include: { tool: { select: { id: true, name: true } } } },
        docs: { select: { id: true, title: true } },
      },
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
