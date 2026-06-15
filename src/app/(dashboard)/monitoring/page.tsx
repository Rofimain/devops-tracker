import { redirect } from "next/navigation";
import { auth, isAdmin } from "@/lib/auth";
import { canWriteAppData } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/topbar";
import { ensureDueDailyChecks } from "@/lib/daily-monitoring";
import {
  addMonth,
  formatActivityDateDisplay,
  formatMonthParam,
  monthDateRange,
  monthLabel,
  parseMonthParam,
  todayWibDateKey,
} from "@/lib/monitoring-date";
import { MonitoringView, type MonitoringEntryRow } from "./monitoring-view";

export default async function MonitoringPage({ searchParams }: { searchParams: { month?: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const month = parseMonthParam(searchParams.month);
  const range = monthDateRange(month);
  const nowMonth = parseMonthParam();
  const isCurrentMonth = formatMonthParam(month) === formatMonthParam(nowMonth);

  if (isCurrentMonth) {
    await ensureDueDailyChecks();
  }

  const entries = await prisma.devOpsMonitoringEntry.findMany({
    where: { activityDate: range },
    orderBy: [{ activityDate: "asc" }, { rowType: "asc" }, { createdAt: "asc" }],
  });

  const serialized: MonitoringEntryRow[] = entries.map((e) => ({
    id: e.id,
    rowType: e.rowType,
    activityCategory: e.activityCategory,
    activity: e.activity,
    activityDate: e.activityDate.toISOString().slice(0, 10),
    activityDateDisplay: formatActivityDateDisplay(e.activityDate),
    application: e.application,
    status: e.status,
    check1At: e.check1At?.toISOString() ?? null,
    check1Status: e.check1Status,
    check2At: e.check2At?.toISOString() ?? null,
    check2Status: e.check2Status,
    source: e.source,
    userId: e.userId,
  }));

  const prev = addMonth(month, -1);
  const next = addMonth(month, 1);

  return (
    <>
      <Topbar title="Daily Monitoring" breadcrumb="DevOps" />
      <div className="app-content">
        <MonitoringView
          initialEntries={serialized}
          monthHuman={monthLabel(month)}
          prevHref={`/monitoring?month=${formatMonthParam(prev)}`}
          nextHref={`/monitoring?month=${formatMonthParam(next)}`}
          thisMonthHref={`/monitoring?month=${formatMonthParam(nowMonth)}`}
          isCurrentMonth={isCurrentMonth}
          todayWib={todayWibDateKey()}
          isAdmin={isAdmin(session.user.role)}
          canMutate={canWriteAppData(session.user.role)}
        />
      </div>
    </>
  );
}
