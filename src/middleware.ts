import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isMemberWriteOrAdminPath } from "@/lib/member-paths";

function secret() {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path.startsWith("/_next") || path === "/favicon.ico") {
    return NextResponse.next();
  }
  /** Logo & favicon (public + metadata route) — harus bisa diakses tanpa sesi */
  if (path.startsWith("/branding/") || path === "/icon") {
    return NextResponse.next();
  }
  if (path.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  /** Jangan redirect dari middleware untuk /login: getToken di Edge bisa beda dengan auth() di Server Component → loop ERR_TOO_MANY_REDIRECTS. */
  if (path === "/login") {
    return NextResponse.next();
  }

  const authSecret = secret();
  const isHttps = request.nextUrl.protocol === "https:";
  const token = await getToken({
    req: request,
    secret: authSecret,
    secureCookie: isHttps,
  });

  if (!token) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(login);
  }

  const role = (token.role as string | undefined) ?? "MEMBER";

  /** Selaras dengan session (`accountApproved === true`): nilai lain/missing = tunggu persetujuan sampai JWT ter-refresh dari DB. */
  if (token.accountApproved !== true) {
    if (path === "/pending-approval") return NextResponse.next();
    if (path.startsWith("/api/auth")) return NextResponse.next();
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Akun menunggu persetujuan admin" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/pending-approval", request.url));
  }

  if (role === "OPERATOR") {
    if (path.startsWith("/purge")) return NextResponse.next();
    if (path.startsWith("/api/cloudflare")) return NextResponse.next();
    if (path.startsWith("/api/purge-presets") && request.method === "GET") {
      return NextResponse.next();
    }
    if (path === "/api/audit/session" && request.method === "POST") {
      return NextResponse.next();
    }
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/purge", request.url));
  }

  if (role === "MEMBER") {
    if (path.startsWith("/purge")) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (path.startsWith("/api/cloudflare") || path.startsWith("/api/purge-presets")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (
      path.startsWith("/api/") &&
      request.method !== "GET" &&
      request.method !== "HEAD" &&
      !(path === "/api/audit/session" && request.method === "POST")
    ) {
      return NextResponse.json({ error: "Forbidden: akun hanya baca" }, { status: 403 });
    }
    if (isMemberWriteOrAdminPath(path)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
