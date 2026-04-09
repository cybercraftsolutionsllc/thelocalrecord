import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@thelocalrecord/core", "@thelocalrecord/storage"]
};

export default nextConfig;
