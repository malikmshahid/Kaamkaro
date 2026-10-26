import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't advertise the framework version to scanners.
  poweredByHeader: false,
  reactStrictMode: true,
  // Uploads are parsed by route handlers, not the framework — keep the default
  // body limit small so a hostile client can't stream gigabytes at a function.
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
