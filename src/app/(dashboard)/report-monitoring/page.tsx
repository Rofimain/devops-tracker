import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canWriteAppData } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/topbar";
import {
  displayMonthsForServices,
  formatCheckDateDisplay,
  parseYearParam,
  PERIOD_LABELS,
} from "@/lib/report-monitoring";
import {
  ReportMonitoringView,
  type ReportCheckRow,
  type ReportServiceRow,
} from "./report-monitoring-view";

export default async function ReportMonitoringPage({
  searchParams,
}: {
  searchParams: { year?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const year = parseYearParam(searchParams.year);
  const canWrite = canWriteAppData(session.user.role);

  const services = await prisma.reportMonitoringService.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      checks: { where: { year } },
    },
  });

  const months = displayMonthsForServices(services.map((s) => s.period));

  const rows: ReportServiceRow[] = services.map((s) => {
    const checksByMonth: Record<number, ReportCheckRow> = {};
    for (const c of s.checks) {
      checksByMonth[c.month] = {
        id: c.id,
        month: c.month,
        checkedAt: c.checkedAt ? c.checkedAt.toISOString().slice(0, 10) : null,
        checkedAtDisplay: formatCheckDateDisplay(c.checkedAt),
        noteText: c.noteText,
        hasImage: Boolean(c.imagePath),
        imageName: c.imageName,
      };
    }
    return {
      id: s.id,
      name: s.name,
      period: s.period,
      periodLabel: PERIOD_LABELS[s.period],
      checksByMonth,
    };
  });

  const prevYear = year - 1;
  const nextYear = year + 1;

  return (
    <>
      <Topbar title="Report Monitoring" breadcrumb="Audit" />
      <div className="app-content">
        <ReportMonitoringView
          year={year}
          months={months}
          services={rows}
          canWrite={canWrite}
          prevHref={`/report-monitoring?year=${prevYear}`}
          nextHref={`/report-monitoring?year=${nextYear}`}
          thisYearHref={`/report-monitoring?year=${new Date().getFullYear()}`}
        />
      </div>
    </>
  );
}
