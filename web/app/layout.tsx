import type { Metadata, Viewport } from "next";
import { Noto_Sans } from "next/font/google";
import "./globals.css";
import "@/features/happy2help/happy.css";
import { SessionProvider } from "@/features/happy2help/session";

const notoSans = Noto_Sans({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-happy",
});

export const metadata: Metadata = {
  title: "Happy2Help",
  description: "Сурагч бүр сонсогдох эрхтэй. Сургуулийн аюулгүй байдал ба тусламжийн erxes plugin.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/brand/icon-192.png", apple: "/brand/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#0F2D5B",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn" className={notoSans.variable}>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
