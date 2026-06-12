import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordActivity } from "@/lib/activity-log";
import { parseInfraCostsFromBody } from "@/lib/project-cost";
import { infraCostItemsToJson, projectCostPerMonthFromInfras } from "@/lib/project-cost-sync";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: { infras: { orderBy: { sortOrder: "asc" } } },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = await req.json();
    const costs = parseInfraCostsFromBody(body);
    const costByEnv = new Map(costs.map((c) => [c.envName.toLowerCase(), c]));

    await prisma.$transaction(async (tx) => {
      for (const infra of project.infras) {
        const patch = costByEnv.get(infra.envName.toLowerCase());
        if (!patch) continue;
        await tx.projectInfra.update({
          where: { id: infra.id },
          data: {
            costItems: infraCostItemsToJson(patch.costItems),
            costNotes: patch.costNotes?.trim() || null,
          },
        });
      }

      const updatedInfras = await tx.projectInfra.findMany({
        where: { projectId: params.id },
        orderBy: { sortOrder: "asc" },
      });

      await tx.project.update({
        where: { id: params.id },
        data: { costPerMonth: projectCostPerMonthFromInfras(updatedInfras) },
      });
    });

    const updated = await prisma.project.findUnique({
      where: { id: params.id },
      include: { infras: { orderBy: { sortOrder: "asc" } } },
    });

    await recordActivity(req, {
      action: "UPDATE",
      details: `Biaya bulanan project "${project.name}" diupdate`,
      userId: session.user.id,
      projectId: params.id,
    });

    return NextResponse.json(updated);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Gagal menyimpan biaya";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
