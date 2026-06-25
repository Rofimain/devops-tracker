export const PROJECT_SORT_COLUMNS = ["name", "url", "description", "category", "management", "status"] as const;

export type ProjectSortColumn = (typeof PROJECT_SORT_COLUMNS)[number];

export const PROJECT_SORT_LABELS: Record<ProjectSortColumn, string> = {
  name: "Site Name",
  url: "URL",
  description: "Description",
  category: "Category",
  management: "Management",
  status: "Status",
};

export function parseProjectSort(sort?: string, dir?: string): {
  column: ProjectSortColumn | null;
  direction: "asc" | "desc";
  orderBy: Record<string, "asc" | "desc">;
} {
  const column = PROJECT_SORT_COLUMNS.includes(sort as ProjectSortColumn) ? (sort as ProjectSortColumn) : null;
  const direction = dir === "desc" ? "desc" : "asc";
  if (!column) {
    return { column: null, direction: "desc", orderBy: { updatedAt: "desc" } };
  }
  return { column, direction, orderBy: { [column]: direction } };
}

export function projectListQuery(params: { status?: string; q?: string; sort?: string; dir?: string }) {
  const sp = new URLSearchParams();
  if (params.status && params.status !== "ALL") sp.set("status", params.status);
  if (params.q) sp.set("q", params.q);
  if (params.sort) sp.set("sort", params.sort);
  if (params.dir) sp.set("dir", params.dir);
  const qs = sp.toString();
  return qs ? `/projects?${qs}` : "/projects";
}

export function projectSortHref(
  column: ProjectSortColumn,
  current: { status?: string; q?: string; sort?: string; dir?: string }
) {
  const nextDir = current.sort === column && current.dir === "asc" ? "desc" : "asc";
  return projectListQuery({ ...current, sort: column, dir: nextDir });
}
