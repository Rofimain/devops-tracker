import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity-log";
import { normalizeCostPerMonth } from "@/lib/utils";
import { normalizeExternalUrl } from "@/lib/external-url";
import { parseInfrasFromBody } from "@/lib/project-infra";
import { parseCostLineItems } from "@/lib/project-cost";
import { infraCostItemsToJson, projectCostPerMonthFromInfras } from "@/lib/project-cost-sync";

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
      const existingInfras = await tx.projectInfra.findMany({ where: { projectId: params.id } });
      const existingCostByEnv = new Map(
        existingInfras.map((inf) => [
          inf.envName.toLowerCase(),
          { costItems: inf.costItems, costNotes: inf.costNotes },
        ])
      );

      await tx.projectInfra.deleteMany({ where: { projectId: params.id } });

      const infraRows = infras.map((row, i) => {
        const preserved = existingCostByEnv.get(row.envName.toLowerCase());
        const costItems =
          row.costItems && row.costItems.length > 0
            ? row.costItems
            : parseCostLineItems(preserved?.costItems);
        const costNotes = row.costNotes?.trim() ? row.costNotes : (preserved?.costNotes ? String(preserved.costNotes) : undefined);
        return {
          projectId: params.id,
          sortOrder: i,
          envName: row.envName,
          targetGroup: row.targetGroup.trim() || null,
          loadBalancer: row.loadBalancer.trim() || null,
          serverIp: row.serverIp.trim() || null,
          url: normalizeExternalUrl(row.url),
          hosting: row.hosting,
          cdn: row.cdn,
          databases: row.databases,
          costItems: infraCostItemsToJson(costItems),
          costNotes: costNotes ? String(costNotes) : null,
        };
      });

      const autoCost = projectCostPerMonthFromInfras(infraRows);
      const productionUrl =
        normalizeExternalUrl(infraRows.find((r) => r.envName.toLowerCase() === "production")?.url ?? undefined) ??
        normalizeExternalUrl(body.url);

      await tx.project.update({
        where: { id: params.id },
        data: {
          name: body.name,
          slug: body.slug,
          description: body.description || null,
          url: productionUrl,
          repoUrl: normalizeExternalUrl(body.repoUrl),
          category: body.category || null,
          management: body.management || null,
          status: body.status,
          platform: body.platform || [],
          webBasedApp: typeof body.webBasedApp === "string" && body.webBasedApp.trim() ? body.webBasedApp.trim() : "Yes",
          costPerMonth: autoCost ?? normalizeCostPerMonth(body.costPerMonth),
          notes: body.notes || null,
        },
      });
      await tx.projectInfra.createMany({ data: infraRows });

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
    await recordActivity(req, {
      action: "UPDATE",
      details: `Project "${project?.name}" diupdate`,
      userId: session.user.id,
      projectId: params.id,
    });
    return NextResponse.json(project);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await recordActivity(req, {
    action: "DELETE",
    details: `Project "${project.name}" dihapus`,
    userId: session.user.id,
    projectId: params.id,
  });
  await prisma.project.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
