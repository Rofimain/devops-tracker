import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardChrome } from "@/components/dashboard-chrome";
import { prisma } from "@/lib/prisma";
import { ensureProjectSchema } from "@/lib/ensure-project-schema";
import { isLimitedNavRole } from "@/lib/roles";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  await ensureProjectSchema();
  const projectCount = isLimitedNavRole(session.user.role) ? 0 : await prisma.project.count();

  return <DashboardChrome projectCount={projectCount}>{children}</DashboardChrome>;
}
