// -----------------------------------------------------------------------------
// GET /api/berkas/<kelompok>/<nama> — menyajikan foto unggahan.
//
// Berkas TIDAK diletakkan di folder publik. Foto kondisi alat memuat isi
// laboratorium dan siapa yang memegangnya; menaruhnya di folder publik berarti
// siapa pun yang menebak namanya dapat mengunduhnya tanpa masuk sama sekali.
// -----------------------------------------------------------------------------

import { readFile, stat } from "node:fs/promises";

import { NextResponse } from "next/server";

import { lokasiBerkas, tipeDariJalur } from "@/lib/berkas";
import { wajibMasuk } from "@/lib/penjaga";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _permintaan: Request,
  { params }: { params: Promise<{ jalur: string[] }> },
) {
  await wajibMasuk();

  const { jalur } = await params;
  const gabungan = jalur.join("/");
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
        // Boleh disimpan peramban: nama berkasnya acak dan tidak pernah dipakai ulang.
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, pesan: "Berkas tidak ditemukan." }, { status: 404 });
  }
}
