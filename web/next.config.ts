import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a production build run beside a live `next dev` without clobbering its .next directory:
  //   NEXT_DIST_DIR=.next-build pnpm --filter happy2help_web build
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // `next dev` opened from phones on the same Wi-Fi (http://<laptop-LAN-IP>:3100). Dev-only setting.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.16.*.*"],
};

export default nextConfig;
