import type { Metadata, Viewport } from "next";

import { Providers } from "@/components/providers";
import { resources } from "@/i18n/resources";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Link Console",
  description: resources["zh-CN"].common.meta.description
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f9fa" },
    { media: "(prefers-color-scheme: dark)", color: "#11151b" }
  ]
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
