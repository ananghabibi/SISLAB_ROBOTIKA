// -----------------------------------------------------------------------------
// POST /api/cron/kode-harian — dipanggil penjadwal setiap pukul 00:01 WIB.
//
// Dilindungi CRON_SECRET, bukan sesi pengguna, karena pemanggilnya adalah
// kontainer penjadwal yang tidak punya akun. Jawabannya TIDAK PERNAH memuat
// kode yang baru dibuat — hanya menyatakan bahwa kode untuk hari itu sudah ada.
// Endpoint yang mengembalikan kode akan meruntuhkan lapis 2 seluruhnya.
// -----------------------------------------------------------------------------

import { NextResponse } from "next/server";

import { rahasiaCronCocok } from "@/lib/cron";
import { pastikanKodeHariIni } from "@/lib/kode-harian";
import { tanggalPendekWib } from "@/lib/waktu";

export const dynamic = "force-dynamic";

export async function POST(permintaan: Request) {
  if (!rahasiaCronCocok(permintaan.headers.get("x-cron-secret"))) {
    return NextResponse.json({ ok: false, pesan: "Tidak berwenang." }, { status: 401 });
  }

  try {
    const { tanggal, baruDibuat } = await pastikanKodeHariIni(true);
    return NextResponse.json({
      ok: true,
      tanggal: tanggalPendekWib(tanggal),
      baruDibuat,
      pesan: baruDibuat
        ? "Kode harian baru diterbitkan."
        : "Kode harian untuk hari ini sudah ada, tidak diubah.",
    });
  } catch (galat) {
    console.error("[cron] gagal menerbitkan kode harian:", galat);
    return NextResponse.json(
      { ok: false, pesan: "Basis data tidak dapat dihubungi." },
      { status: 503 },
    );
  }
}
