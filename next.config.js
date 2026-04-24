/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  /** Browser selalu minta /favicon.ico — arahkan ke logo GMV (JPEG). */
  async redirects() {
    return [
      {
        source: "/favicon.ico",
        destination: "/branding/gmv-logo.jpg",
        permanent: false,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000"] },
    instrumentationHook: true,
  },
};

module.exports = nextConfig;
