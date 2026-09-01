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

/**
 * Kepala tanggapan keamanan.
 *
 * Ditaruh di sini, bukan hanya di `Caddyfile`, karena kepala yang hanya ada di
 * reverse proxy akan hilang begitu seseorang menjalankan `npm start` langsung —
 * dan pemasangan darurat di laboratorium justru sering terjadi begitu. Yang
 * ganda tidak berbahaya: Caddy menimpanya dengan nilai yang sama.
 *
 * `frame-ancestors` dan `form-action` adalah dua yang paling berarti bagi
 * sistem ini. Yang pertama menutup halaman absensi dari pembingkaian di situs
 * lain; yang kedua memastikan formulir apa pun — termasuk yang disuntikkan
 * lewat peralatan pengembang peramban — hanya dapat mengirim ke peladen ini
 * sendiri, bukan ke alamat luar.
 */
function kepalaKeamanan(pengembangan: boolean) {
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    // QR dibuat sebagai data URL, dan pemindai kamera memakai blob.
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "font-src 'self' data:",
    // Next.js menyisipkan skrip dan gaya sebaris untuk hidrasi. `unsafe-eval`
    // hanya diperlukan oleh penyegaran cepat saat pengembangan.
    `script-src 'self' 'unsafe-inline'${pengembangan ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `connect-src 'self'${pengembangan ? " ws: wss:" : ""}`,
  ].join("; ");

  return [
    { key: "Content-Security-Policy", value: csp },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // Kamera tetap diizinkan: pemindai QR absensi memerlukannya. Sisanya tidak
    // pernah dipakai sistem ini, jadi ditutup.
    {
      key: "Permissions-Policy",
      value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
    },
  ];
}

const nextConfig: NextConfig = {
  allowedDevOrigins: alamatPengembangan(),
  async headers() {
    return [
      { source: "/:jalur*", headers: kepalaKeamanan(process.env.NODE_ENV !== "production") },
    ];
  },
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
    // Surat Keterangan Kontribusi memakai perender yang sama, jadi ia menemui
    // kegagalan yang sama bila berkas hurufnya tidak ikut disertakan — dan
    // hanya di produksi, tidak pernah saat `npm run dev`.
    "/api/skk/[id]/pdf": ["./node_modules/pdfkit/js/**/*"],
  },
  poweredByHeader: false,
  serverExternalPackages: ["bcryptjs", "@react-pdf/renderer"],
  experimental: { authInterrupts: true },
};

export default nextConfig;
