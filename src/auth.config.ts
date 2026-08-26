// -----------------------------------------------------------------------------
// Bagian konfigurasi Auth.js yang aman dijalankan di runtime Edge.
//
// Middleware Next.js berjalan di Edge dan tidak bisa memuat Prisma maupun
// bcrypt. Karena itu penyedia (provider) dan segala hal yang menyentuh basis
// data tinggal di `src/auth.ts`; berkas ini hanya memuat yang bisa ikut ke Edge.
// -----------------------------------------------------------------------------

import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 12, // 12 jam: cukup untuk satu hari kerja di lab.
  },
  pages: {
    signIn: "/masuk",
    error: "/masuk",
  },
  callbacks: {
    /**
     * Pemetaan token -> sesi. Murni, tanpa basis data, sehingga ikut terbawa ke
     * Edge dan middleware bisa membaca peran pengguna. Callback `jwt` yang
     * mengisi token TIDAK bisa ikut ke sini karena menyentuh Prisma; ia tetap
     * di `src/auth.ts` dan hanya berjalan di runtime Node.
     */
    session({ session, token }) {
      session.user.id = token.uid;
      session.user.nama = token.nama;
      session.user.npm = token.npm;
      session.user.role = token.role;
      session.user.jenjang = token.jenjang;
      session.user.status = token.status;
      session.user.squadId = token.squadId;
      session.user.squadNama = token.squadNama;
      session.user.fakultas = token.fakultas;
      session.user.name = token.nama;
      session.user.email = token.email ?? "";
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
