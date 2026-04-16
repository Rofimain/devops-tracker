import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeCostPerMonth, slugify } from "@/lib/utils";
import { parseInfrasFromBody } from "@/lib/project-infra";

function parseIdArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x)).filter(Boolean);
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { tools: true, docs: true } }, infras: { orderBy: { sortOrder: "asc" } } },
  });
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const slug = body.slug || slugify(body.name);
    const infras = parseInfrasFromBody(body);
    const toolIds = parseIdArray(body.toolIds);
    const docIds = parseIdArray(body.docIds);

    const createdId = await prisma.$transaction(async (tx) => {
      const p = await tx.project.create({
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
          webBasedApp: typeof body.webBasedApp === "string" && body.webBasedApp.trim() ? body.webBasedApp.trim() : "Yes",
          costPerMonth: normalizeCostPerMonth(body.costPerMonth),
          notes: body.notes || null,
          infras: {
            create: infras.map((row, i) => ({
              sortOrder: i,
              envName: row.envName,
              targetGroup: row.targetGroup.trim() || null,
              loadBalancer: row.loadBalancer.trim() || null,
              serverIp: row.serverIp.trim() || null,
              hosting: row.hosting,
              cdn: row.cdn,
              databases: row.databases,
            })),
          },
        },
      });
      if (toolIds.length) {
        await tx.projectTool.createMany({
          data: toolIds.map((toolId) => ({ projectId: p.id, toolId })),
          skipDuplicates: true,
        });
      }
      if (docIds.length) {
        await tx.doc.updateMany({
          where: { id: { in: docIds } },
          data: { projectId: p.id },
        });
      }
      return p.id;
    });

    const project = await prisma.project.findUnique({
      where: { id: createdId },
      include: {
        infras: { orderBy: { sortOrder: "asc" } },
        tools: { include: { tool: { select: { id: true, name: true } } } },
        docs: { select: { id: true, title: true } },
      },
    });
    if (!project) return NextResponse.json({ error: "Create failed" }, { status: 500 });

    await prisma.activity.create({
      data: { action: "CREATE", details: `Project "${project.name}" dibuat`, userId: session.user.id, projectId: project.id },
    });
    return NextResponse.json(project, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Slug sudah digunakan. Ganti nama project." }, { status: 400 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
