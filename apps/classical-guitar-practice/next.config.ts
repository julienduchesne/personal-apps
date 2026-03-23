import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@aws-sdk/client-s3"],
  transpilePackages: ["@repo/storage", "@repo/auth", "@repo/ui"],
};

export default nextConfig;
