import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env["NEXT_PUBLIC_BACKEND_URL"] ?? "http://localhost:4000",
  },
  serverExternalPackages: ["@dialectical/backend"],
};

export default nextConfig;
