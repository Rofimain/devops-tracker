import { redirect } from "next/navigation";

export default function ReportMonitoringRedirect({
  searchParams,
}: {
  searchParams: { year?: string };
}) {
  const year = searchParams.year ? `?year=${encodeURIComponent(searchParams.year)}` : "";
  redirect(`/audit/report-monitoring${year}`);
}
