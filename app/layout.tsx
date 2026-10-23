import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "../lib/i18n";

export const metadata: Metadata = {
  title: "共境 Earthweave · 一起构建可体验的地球",
  description: "上传你看见的世界，从地球出发，用手机或 VR 走近没有去过的地方。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased"><I18nProvider>{children}</I18nProvider></body>
    </html>
  );
}
