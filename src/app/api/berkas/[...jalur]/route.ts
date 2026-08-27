// -----------------------------------------------------------------------------
// GET /api/berkas/<kelompok>/<nama> — menyajikan foto unggahan.
//
// Berkas TIDAK diletakkan di folder publik. Foto kondisi alat memuat isi
// laboratorium dan siapa yang memegangnya; menaruhnya di folder publik berarti
// siapa pun yang menebak namanya dapat mengunduhnya tanpa masuk sama sekali.
//
// Foto kartu identitas jaminan dijaga lebih ketat lagi. Nama berkasnya memang
// acak, tetapi "sulit ditebak" bukan penjagaan: satu tautan yang bocor sudah
// cukup membuat pindaian KTM seorang anggota terbaca seluruh laboratorium.
// Karena itu folder `identitas/` menuntut izin tulis peminjaman — izin yang
// dipegang petugas yang memang menerima kartu itu.
// -----------------------------------------------------------------------------

import { readFile, stat } from "node:fs/promises";

import { NextResponse } from "next/server";

import { lokasiBerkas, tipeDariJalur } from "@/lib/berkas";
import { wajibIzin, wajibMasuk } from "@/lib/penjaga";
import { KELOMPOK_IDENTITAS } from "@/lib/unggahan";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _permintaan: Request,
  { params }: { params: Promise<{ jalur: string[] }> },
) {
  const { jalur } = await params;
  const gabungan = jalur.join("/");

  if (jalur[0] === KELOMPOK_IDENTITAS) {
    await wajibIzin("peminjaman", "tulis");
  } else {
    await wajibMasuk();
  }
  const lokasi = lokasiBerkas(gabungan);
  if (!lokasi) {
    return NextResponse.json({ ok: false, pesan: "Jalur berkas tidak sah." }, { status: 400 });
  }

  try {
    await stat(lokasi);
    const isi = await readFile(lokasi);
    return new NextResponse(new Uint8Array(isi), {
      headers: {
        "Content-Type": tipeDariJalur(gabungan),
        // Foto kondisi boleh disimpan peramban; nama berkasnya acak dan tidak
        // pernah dipakai ulang. Kartu identitas tidak: ia dihapus saat alat
        // kembali, dan salinan yang mengendap di singgahan peramban akan hidup
        // lebih lama daripada berkas aslinya.
        "Cache-Control":
          jalur[0] === KELOMPOK_IDENTITAS ? "private, no-store" : "private, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, pesan: "Berkas tidak ditemukan." }, { status: 404 });
  }
}
