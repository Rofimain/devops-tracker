import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { Role } from "@prisma/client";
import { authConfig } from "@/auth.config";
import { isEmailAllowedForSignIn, normalizeEmail } from "@/lib/login-allowlist";

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN ?? "";
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL ?? "";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email ?? "";
      if (ALLOWED_DOMAIN && !email.endsWith(`@${ALLOWED_DOMAIN}`)) {
        return false;
      }
      const allowed = await isEmailAllowedForSignIn(email);
      if (!allowed) {
        return "/login?error=InviteOnly";
      }
      if (normalizeEmail(email) === normalizeEmail(SUPER_ADMIN_EMAIL)) {
        await prisma.user.updateMany({
          where: { email },
          data: { role: Role.SUPER_ADMIN },
        });
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        token.role = dbUser?.role ?? Role.MEMBER;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
  pages: { signIn: "/login", error: "/login" },
});

export function isAdmin(role?: Role) {
  return role === Role.ADMIN || role === Role.SUPER_ADMIN;
}
export function isSuperAdmin(role?: Role) {
  return role === Role.SUPER_ADMIN;
}
