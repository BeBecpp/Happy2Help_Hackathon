import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Happy2Help",
    short_name: "Happy2Help",
    description: "Сурагч бүр сонсогдох эрхтэй.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0F2D5B",
    lang: "mn",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
