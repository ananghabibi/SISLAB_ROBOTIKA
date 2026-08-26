import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SILAB — Laboratorium Robotika FT UNISMA",
    template: "%s · SILAB",
  },
  description:
    "Sistem Informasi Laboratorium Robotika, Fakultas Teknik, Universitas Islam Malang.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#14416b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
