import { Topbar } from "@/components/topbar";
import { NewToolForm } from "./new-tool-form";

export default function NewToolPage() {
  return (
    <>
      <Topbar title="Add Tool" breadcrumb="Tools Catalog" />
      <div className="app-content">
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <NewToolForm />
        </div>
      </div>
    </>
  );
}
