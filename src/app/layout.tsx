import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/session-provider";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "DevOps Tracker",
  description: "Internal DevOps Project Tracking Portal",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <SessionProvider session={session}>
            {children}
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
