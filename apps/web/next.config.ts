import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true
  },
  transpilePackages: ["@thelocalrecord/core", "@thelocalrecord/storage"]
};

export default nextConfig;
