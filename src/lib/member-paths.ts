/** Path dashboard yang tidak boleh diakses Member (hanya baca). */
export function isMemberWriteOrAdminPath(path: string): boolean {
  if (path.startsWith("/admin")) return true;
  if (path === "/projects/new") return true;
  if (path === "/tools/new") return true;
  if (path === "/docs/new") return true;
  if (path.includes("/edit")) return true;
  if (path.includes("/tools/add")) return true;
  return false;
}
