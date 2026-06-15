import { Topbar } from "@/components/topbar";
import { ProjectForm } from "../project-form";
import Link from "next/link";

export default function NewProjectPage() {
  return (
    <>
      <Topbar title="New Project" breadcrumb="Projects" breadcrumbHref="/projects" />
      <div className="app-content">
        <ProjectForm mode="create" />
      </div>
    </>
  );
}
