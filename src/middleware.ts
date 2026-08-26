// -----------------------------------------------------------------------------
// Penjaga rute di sisi peladen.
//
// Ini BUKAN sekadar menyembunyikan menu. Permintaan ke URL yang tidak berhak
// dihentikan sebelum halaman dirender, walaupun URL-nya diketik langsung.
// Halaman dan Server Action tetap memanggil penjagaannya sendiri lewat
// `src/lib/penjaga.ts` — middleware adalah lapis pertama, bukan satu-satunya.
// -----------------------------------------------------------------------------

import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/auth.config";
import { peranBolehMembuka, RUTE_PUBLIK } from "@/lib/rute";

const { auth } = NextAuth(authConfig);

export default auth((permintaan) => {
  const { nextUrl } = permintaan;
  const jalur = nextUrl.pathname;

  if (RUTE_PUBLIK.some((r) => jalur === r || jalur.startsWith(`${r}/`))) {
    return NextResponse.next();
  }

  const sesi = permintaan.auth;
  if (!sesi?.user?.id) {
    const tujuan = new URL("/masuk", nextUrl);
    tujuan.searchParams.set("lanjut", jalur);
    return NextResponse.redirect(tujuan);
  }

  if (!peranBolehMembuka(sesi.user.role, jalur)) {
    // Ditulis ulang ke /403, BUKAN dialihkan: URL yang dicoba tetap terlihat di
    // bilah alamat, dan halaman itu memanggil forbidden() sehingga jawabannya
    // benar-benar berstatus 403. (NextResponse.rewrite mengabaikan opsi status,
    // jadi statusnya harus datang dari halaman tujuan.)
    return NextResponse.rewrite(new URL("/403", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Semua rute kecuali berkas statis dan gambar bawaan Next.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
