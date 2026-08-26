// -----------------------------------------------------------------------------
// GET /api/display/status — daftar nama yang sedang berada di laboratorium.
//
// Dipanggil berkala oleh halaman /display supaya daftarnya bergerak tanpa perlu
// memuat ulang seluruh halaman.
//
// Endpoint ini SENGAJA tidak pernah menyertakan kode harian. Kode harian hanya
// boleh dibaca dari layar; begitu ia melewati sebuah API, ia bisa diminta dari
// mana saja oleh siapa saja yang tahu alamatnya.
// -----------------------------------------------------------------------------

import { NextResponse } from "next/server";

import { sedangDiLab } from "@/lib/absensi";
import { periksaJaringan } from "@/lib/jaringan";

export const dynamic = "force-dynamic";

export async function GET(permintaan: Request) {
  const jaringan = periksaJaringan(permintaan.headers);
  if (!jaringan.diizinkan) {
    return NextResponse.json({ ok: false, pesan: jaringan.alasan }, { status: 403 });
  }

  try {
    const daftar = await sedangDiLab();
    return NextResponse.json(
      {
        ok: true,
        orang: daftar.map((a) => ({
          nama: a.user.nama,
          squad: a.user.squad?.kode ?? null,
          jamMasuk: a.jamMasuk,
          manual: a.manual,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (galat) {
    console.error("[display] gagal membaca daftar kehadiran:", galat);
    return NextResponse.json(
      { ok: false, pesan: "Basis data tidak dapat dihubungi." },
      { status: 503 },
    );
  }
}
