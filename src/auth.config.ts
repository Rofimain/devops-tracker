import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Config ini HANYA untuk middleware (Edge Runtime)
// Tidak boleh ada Prisma/Node.js-only imports di sini
export const authConfig: NextAuthConfig = {
  trustHost: true, 
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = nextUrl.pathname === "/login";
      const isApiAuth = nextUrl.pathname.startsWith("/api/auth");

      if (isApiAuth) return true;
      if (isLoginPage) {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }
      if (!isLoggedIn) return false; // redirect ke /login otomatis
      return true;
    },
  },
};
