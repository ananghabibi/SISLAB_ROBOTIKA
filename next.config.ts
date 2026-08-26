import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dibutuhkan agar image Docker ramping untuk mini PC di laboratorium.
  output: "standalone",
  // Next.js menebak akar ruang kerja dari letak package-lock.json. Bila pengguna
  // pernah tidak sengaja menjalankan `npm install` di folder rumahnya, tebakan
  // itu meleset ke sana dan penelusuran berkas ikut salah. Tetapkan saja.
  outputFileTracingRoot: path.resolve(),
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: true },
  serverExternalPackages: ["bcryptjs"],
  experimental: {
    // Mengaktifkan forbidden()/unauthorized() dari next/navigation, sehingga
    // penolakan hak akses menghasilkan status 403/401 yang sebenarnya —
    // bukan pengalihan diam-diam yang menyamar sebagai keberhasilan.
    authInterrupts: true,
  },
};

export default nextConfig;
