import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { Role } from "@prisma/client";
import { authConfig } from "@/auth.config";

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN ?? "";
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL ?? "";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: { strategy: "database" },
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
      if (email === SUPER_ADMIN_EMAIL) {
        await prisma.user.updateMany({
          where: { email, role: { not: Role.SUPER_ADMIN } },
          data: { role: Role.SUPER_ADMIN },
        });
      }
      return true;
    },
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        session.user.role = dbUser?.role ?? Role.MEMBER;
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
