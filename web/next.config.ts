import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a production build run beside a live `next dev` without clobbering its .next directory:
  //   NEXT_DIST_DIR=.next-build pnpm --filter happy2help_web build
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
