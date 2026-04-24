import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/session-provider";
import { auth } from "@/lib/auth";

const BRAND_ICON = "/branding/gmv-logo.jpg?v=gmv4";

function metadataBaseUrl(): URL | undefined {
  const raw = process.env.NEXTAUTH_URL?.trim();
  if (!raw) return undefined;
  try {
    return new URL(raw.endsWith("/") ? raw.slice(0, -1) : raw);
  } catch {
    return undefined;
  }
}

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl(),
  title: "DevOps Tracker",
  description: "Internal DevOps Project Tracking Portal",
  icons: {
    /** ICO dulu (paling kompatibel); PNG setelah middleware mengizinkan /favicon.png tanpa login */
    icon: [
      { url: "/favicon.ico?v=gmv6", sizes: "any" },
      { url: "/favicon.png?v=gmv6", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: BRAND_ICON, sizes: "180x180" }],
  },
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
