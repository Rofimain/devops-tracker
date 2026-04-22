import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { Role } from "@prisma/client";
import { authConfig } from "@/auth.config";
import { isEmailAllowedForSignIn, normalizeEmail } from "@/lib/login-allowlist";

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN ?? "";
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL ?? "";

/** Masa berlaku sesi (detik). Boleh diubah lewat env tanpa deploy ulang kode. Default 8 jam. Min 300 s, max 30 hari. */
function sessionMaxAgeSeconds() {
  const raw = process.env.SESSION_MAX_AGE_SECONDS?.trim();
  const n = raw ? parseInt(raw, 10) : NaN;
  if (!Number.isFinite(n) || n < 300) return 28_800;
  return Math.min(n, 2_592_000);
}

const SESSION_MAX_AGE = sessionMaxAgeSeconds();

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE },
  jwt: { maxAge: SESSION_MAX_AGE },
  events: {
    async createUser({ user }) {
      if (!user.id) return;
      const norm = normalizeEmail(user.email ?? "");
      const isSuper = Boolean(SUPER_ADMIN_EMAIL.trim() && norm === normalizeEmail(SUPER_ADMIN_EMAIL));
      await prisma.user.update({
        where: { id: user.id },
        data: { accountApproved: isSuper ? true : false },
      });
    },
  },
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
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id && user.email) {
        token.id = user.id;
        const norm = normalizeEmail(user.email);
        if (SUPER_ADMIN_EMAIL.trim() && norm === normalizeEmail(SUPER_ADMIN_EMAIL)) {
          await prisma.user.update({
            where: { id: user.id },
            data: { role: Role.SUPER_ADMIN, accountApproved: true },
          });
        } else {
          const invite = await prisma.loginAllowlist.findUnique({ where: { email: norm } });
          if (invite) {
            await prisma.user.update({
              where: { id: user.id },
              data: { role: invite.invitedRole },
            });
          }
        }
      }

      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, accountApproved: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.accountApproved = dbUser.accountApproved;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.accountApproved = token.accountApproved === true;
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
