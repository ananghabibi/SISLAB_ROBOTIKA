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
import { asalPermintaan } from "@/lib/permintaan";
import { peranBolehMembuka, RUTE_PUBLIK } from "@/lib/rute";

const { auth } = NextAuth(authConfig);

export default auth((permintaan) => {
  const { nextUrl } = permintaan;
  const jalur = nextUrl.pathname;
  // Dibangun dari header, bukan dari nextUrl — lihat src/lib/permintaan.ts.
  const asal = asalPermintaan(permintaan.headers, nextUrl.host);

  if (RUTE_PUBLIK.some((r) => jalur === r || jalur.startsWith(`${r}/`))) {
    return NextResponse.next();
  }

  const sesi = permintaan.auth;
  if (!sesi?.user?.id) {
    // Permintaan API dijawab 401 dalam bentuk JSON. Mengalihkannya ke halaman
    // masuk akan membuat pemanggilnya menerima 307 berisi HTML dan mengira
    // permintaannya berhasil.
    if (jalur.startsWith("/api/")) {
      return NextResponse.json(
        { ok: false, pesan: "Anda belum masuk. Masuk dulu dengan akun kampus." },
        { status: 401 },
      );
    }
    const tujuan = new URL("/masuk", asal);
    tujuan.searchParams.set("lanjut", jalur);
    return NextResponse.redirect(tujuan);
  }

  if (!peranBolehMembuka(sesi.user.role, jalur)) {
    if (jalur.startsWith("/api/")) {
      return NextResponse.json(
        { ok: false, pesan: "Peran Anda tidak berhak atas sumber daya ini." },
        { status: 403 },
      );
    }
    // Ditulis ulang ke /403, BUKAN dialihkan: pengalihan akan menyamarkan
    // penolakan sebagai keberhasilan, sedangkan penulisan ulang membuat URL
    // yang dicoba tetap terlihat di bilah alamat. Status 403 yang sebenarnya
    // datang dari halaman tujuan, yang memanggil forbidden().
    return NextResponse.rewrite(new URL("/403", asal));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Semua rute kecuali berkas statis dan gambar bawaan Next.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
