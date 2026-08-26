import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dibutuhkan agar image Docker ramping untuk mini PC di laboratorium.
  output: "standalone",
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
