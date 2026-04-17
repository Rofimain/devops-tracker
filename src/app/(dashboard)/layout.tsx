import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { prisma } from "@/lib/prisma";
import { ensureProjectSchema } from "@/lib/ensure-project-schema";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  await ensureProjectSchema();
  const projectCount = session.user.role === Role.OPERATOR ? 0 : await prisma.project.count();

  return (
    <div className="app-layout">
      <Sidebar projectCount={projectCount} />
      <div className="app-main">{children}</div>
    </div>
  );
}
