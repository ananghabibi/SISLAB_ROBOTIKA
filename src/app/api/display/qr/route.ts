// -----------------------------------------------------------------------------
// GET /api/display/qr — gambar QR berputar untuk layar laboratorium.
//
// QR dibuat di peladen sebagai PNG, bukan di peramban. Dengan begitu tidak ada
// satu pun pustaka QR yang perlu dikirim ke layar, dan yang lebih penting:
// token tidak pernah singgah di JavaScript halaman, tempat ia bisa dibaca dan
// diteruskan lewat konsol peramban.
//
// Hanya dapat diakses dari jaringan laboratorium.
// -----------------------------------------------------------------------------

import { NextResponse } from "next/server";
import QRCode from "qrcode";

import { periksaJaringan } from "@/lib/jaringan";
import { pastikanKodeHariIni } from "@/lib/kode-harian";
import { terbitkanToken } from "@/lib/token-qr";
import { prisma } from "@/lib/prisma";
import { tanggalKalenderWib } from "@/lib/waktu";

export const dynamic = "force-dynamic";

export async function GET(permintaan: Request) {
  const jaringan = periksaJaringan(permintaan.headers);
  if (!jaringan.diizinkan) {
    return NextResponse.json({ ok: false, pesan: jaringan.alasan }, { status: 403 });
  }

  try {
    await pastikanKodeHariIni();
    const sesi = await prisma.dailyCode.findUniqueOrThrow({
      where: { tanggal: tanggalKalenderWib() },
      select: { id: true },
    });

    const png = await QRCode.toBuffer(terbitkanToken(sesi.id), {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 512,
      color: { dark: "#14181f", light: "#ffffff" },
    });

    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        // Token hanya berlaku puluhan detik; satu salinan pun tidak boleh disimpan.
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  } catch (galat) {
    console.error("[display] gagal membuat QR:", galat);
    return NextResponse.json(
      { ok: false, pesan: "Basis data tidak dapat dihubungi, QR tidak dapat diterbitkan." },
      { status: 503 },
    );
  }
}
