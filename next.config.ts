import { networkInterfaces } from "node:os";
import path from "node:path";

import type { NextConfig } from "next";

/**
 * Alamat IPv4 laptop sendiri, untuk `allowedDevOrigins`.
 *
 * Saat mengembangkan, halaman dibuka dari ponsel lewat alamat WiFi laptop
 * (mis. http://172.16.15.117:3000), sementara peladen pengembangan menganggap
 * dirinya `localhost`. Next.js memperingatkan permintaan lintas asal itu, dan
 * pada versi mayor berikutnya ia akan DITOLAK — pengembangan lewat ponsel
 * berhenti bekerja tanpa ada yang mengubah kode.
 *
 * Alamatnya dibaca dari mesin ini sendiri alih-alih ditulis tangan, karena
 * alamat WiFi berubah setiap kali laptop menyambung ulang. Hanya berlaku pada
 * `next dev`; build produksi tidak memakainya sama sekali.
 */
function alamatPengembangan(): string[] {
  const alamat: string[] = [];
  for (const daftar of Object.values(networkInterfaces())) {
    for (const a of daftar ?? []) {
      if (a.family === "IPv4" && !a.internal) alamat.push(a.address);
    }
  }
  return alamat;
}

const nextConfig: NextConfig = {
  allowedDevOrigins: alamatPengembangan(),
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
  serverExternalPackages: ["bcryptjs", "@react-pdf/renderer"],
  experimental: { authInterrupts: true },
};

export default nextConfig;
