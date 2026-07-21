import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { canWriteWebDecommissioned } from "@/lib/roles";
import { Topbar } from "@/components/topbar";
import { EMPTY_FORM, WebDecommissionForm } from "../web-decommission-form";

export default async function NewWebDecommissionPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!canWriteWebDecommissioned(session.user.role)) redirect("/audit/web-decommissioned");

  return (
    <>
      <Topbar title="Dokumentasi baru" breadcrumb="Audit" breadcrumbHref="/audit" />
      <div className="app-content">
        <WebDecommissionForm mode="create" initial={EMPTY_FORM} canWrite />
      </div>
    </>
  );
}
