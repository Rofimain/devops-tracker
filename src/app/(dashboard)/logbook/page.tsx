import { redirect } from "next/navigation";
import { auth, isAdmin } from "@/lib/auth";
import { canWriteAppData } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { addIsoWeek, formatWeekParam, parseWeekParam, weekLabel } from "@/lib/logbook-week";
import { Topbar } from "@/components/topbar";
import { LogbookWeekView, type LogbookEntryRow } from "./logbook-week-view";

export default async function LogbookPage({ searchParams }: { searchParams: { week?: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const w = parseWeekParam(searchParams.week);
  const nowWeek = parseWeekParam();

  const entries = await prisma.logbookEntry.findMany({
    where: { isoYear: w.isoYear, isoWeek: w.isoWeek },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "desc" },
  });

  const serialized: LogbookEntryRow[] = entries.map((e) => ({
    id: e.id,
    userId: e.userId,
    category: e.category,
    title: e.title,
    body: e.body,
    createdAt: e.createdAt.toISOString(),
    user: e.user,
  }));

  const prev = addIsoWeek(w, -1);
  const next = addIsoWeek(w, 1);
  const isCurrentWeek = formatWeekParam(w) === formatWeekParam(nowWeek);

  return (
    <>
      <Topbar title="Logbook mingguan" breadcrumb="DevOps" />
      <div className="app-content">
        <LogbookWeekView
          initialEntries={serialized}
          week={w}
          weekHuman={weekLabel(w)}
          prevHref={`/logbook?week=${formatWeekParam(prev)}`}
          nextHref={`/logbook?week=${formatWeekParam(next)}`}
          thisWeekHref={`/logbook?week=${formatWeekParam(nowWeek)}`}
          isCurrentWeek={isCurrentWeek}
          currentUserId={session.user.id}
          isAdmin={isAdmin(session.user.role)}
          canMutate={canWriteAppData(session.user.role)}
        />
      </div>
    </>
  );
}
