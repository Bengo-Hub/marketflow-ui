import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";
import { securityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  turbopack: {},
  async headers() {
    return securityHeaders(process.env, process.env.NODE_ENV === "development");
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.simpleicons.org" },
      { protocol: "https", hostname: "marketflowapi.codevertexafrica.com", pathname: "/media/**" },
    ],
  },
};

const pwaConfig = withPWA({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: true,
  workboxOptions: {
    skipWaiting: false,
    clientsClaim: true,
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /^https?.*/,
        handler: "NetworkFirst",
        options: {
          cacheName: "mf-offline",
          expiration: { maxEntries: 200 },
        },
      },
    ],
  },
});

export default pwaConfig(nextConfig);
