import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dibutuhkan agar image Docker ramping untuk mini PC di laboratorium.
  output: "standalone",
  // Next.js menebak akar ruang kerja dari letak package-lock.json. Bila pengguna
  // pernah tidak sengaja menjalankan `npm install` di folder rumahnya, tebakan
  // itu meleset ke sana dan penelusuran berkas ikut salah. Tetapkan saja.
  outputFileTracingRoot: path.resolve(),
  // pdfkit — yang dipakai @react-pdf/renderer — memuat berkas huruf bawaannya
  // lewat require dinamis, sehingga penelusuran berkas Next.js tidak melihatnya
  // dan keluaran standalone terbit tanpa berkas itu. Akibatnya perenderan PDF
  // gagal hanya di produksi, bukan saat `npm run dev`. Disertakan secara tegas.
  outputFileTracingIncludes: {
    "/api/ekspor/rekap-pdf": ["./node_modules/pdfkit/js/**/*"],
  },
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: true },
  serverExternalPackages: ["bcryptjs", "@react-pdf/renderer"],
  experimental: { authInterrupts: true },
};

export default nextConfig;
