import { Topbar } from "@/components/topbar";
import { ProjectForm } from "../project-form";
import Link from "next/link";

export default function NewProjectPage() {
  return (
    <>
      <Topbar title="New Project" breadcrumb="Projects" />
      <div className="app-content">
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <ProjectForm mode="create" />
        </div>
      </div>
    </>
  );
}
