// -----------------------------------------------------------------------------
// POST /api/cron/tandai-terlambat — dipanggil penjadwal setiap pukul 00:05 WIB.
//
// Hanya mengganti label DIPINJAM menjadi TERLAMBAT supaya daftar di layar ikut
// memerah. Ia bukan sumber kebenaran: potongan skor kontribusi memeriksa
// tenggat secara langsung, jadi penjadwal yang mati semalam tidak membuat
// seorang pun lolos dari catatannya.
// -----------------------------------------------------------------------------

import { NextResponse } from "next/server";

import { rahasiaCronCocok } from "@/lib/cron";
import { tandaiTerlambat } from "@/lib/inventaris";

export const dynamic = "force-dynamic";

export async function POST(permintaan: Request) {
  if (!rahasiaCronCocok(permintaan.headers.get("x-cron-secret"))) {
    return NextResponse.json({ ok: false, pesan: "Tidak berwenang." }, { status: 401 });
  }

  try {
    const jumlah = await tandaiTerlambat();
    return NextResponse.json({
      ok: true,
      jumlah,
      pesan:
        jumlah === 0
          ? "Tidak ada pinjaman yang lewat tenggat."
          : `${jumlah} pinjaman ditandai terlambat.`,
    });
  } catch (galat) {
    console.error("[cron] gagal menandai pinjaman terlambat:", galat);
    return NextResponse.json(
      { ok: false, pesan: "Basis data tidak dapat dihubungi." },
      { status: 503 },
    );
  }
}
