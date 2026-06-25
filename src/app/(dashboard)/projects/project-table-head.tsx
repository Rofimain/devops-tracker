import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  PROJECT_SORT_LABELS,
  type ProjectSortColumn,
  projectSortHref,
} from "./project-sort";

export function ProjectSortableTh({
  column,
  current,
  style,
}: {
  column: ProjectSortColumn;
  current: { status?: string; q?: string; sort?: string; dir?: string };
  style?: CSSProperties;
}) {
  const active = current.sort === column;
  const dir = current.dir === "desc" ? "desc" : "asc";
  const Icon = active ? (dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <th style={style}>
      <Link href={projectSortHref(column, current)} className="table-sort-link">
        {PROJECT_SORT_LABELS[column]}
        <Icon size={12} className={active ? "table-sort-icon active" : "table-sort-icon"} />
      </Link>
    </th>
  );
}
