// -----------------------------------------------------------------------------
// GET /api/inventaris/label-qr — lembar label QR aset siap cetak.
//
// Saringan mengikuti halaman inventaris (cari, kategori, kondisi),
// supaya petugas dapat mencetak ulang satu kategori saja tanpa membuang
// enam halaman label yang sudah tertempel.
//
// QR dibuat di sini sebagai PNG, bukan di peramban: hasilnya harus disematkan
// ke dalam PDF, dan PDF dirender di peladen.
// -----------------------------------------------------------------------------

import { createElement, type ReactElement } from "react";

import type { Prisma } from "@prisma/client";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import QRCode from "qrcode";

import { DokumenLabelAset, type LabelAset } from "@/components/pdf/label-aset-pdf";
import { namaBerkas } from "@/lib/ekspor";
import { bungkusKodeAset, kondisiAsetSah } from "@/lib/aset";
import { wajibIzin } from "@/lib/penjaga";
import { prisma } from "@/lib/prisma";
import { tanggalDanJamWib } from "@/lib/waktu";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Batas aman satu kali cetak; 300 label sudah 15 halaman. */
const BATAS_LABEL = 300;

export async function GET(permintaan: Request) {
  // Label adalah pintu masuk peminjaman, jadi siapa pun yang boleh menulis
  // inventaris boleh mencetaknya. Yang hanya boleh membaca tidak perlu.
  await wajibIzin("inventaris", "tulis");

  const kueri = new URL(permintaan.url).searchParams;
  const kategori = kueri.get("kategori")?.trim();
  const kondisi = kueri.get("kondisi")?.trim();
  const cari = kueri.get("cari")?.trim();

  const saringan: Prisma.AssetWhereInput = {};
  if (kategori) saringan.kategori = kategori;
  if (kondisi && kondisiAsetSah(kondisi)) saringan.kondisi = kondisi;
  if (cari) {
    saringan.OR = [
      { kodeAset: { contains: cari, mode: "insensitive" } },
      { nama: { contains: cari, mode: "insensitive" } },
      { merk: { contains: cari, mode: "insensitive" } },
    ];
  }

  const aset = await prisma.asset.findMany({
    where: saringan,
    orderBy: { kodeAset: "asc" },
    take: BATAS_LABEL,
    select: { kodeAset: true, nama: true, kategori: true, lokasi: true },
  });

  if (aset.length === 0) {
    return NextResponse.json(
      { ok: false, pesan: "Tidak ada aset yang cocok dengan saringan ini." },
      { status: 404 },
    );
  }

  const label: LabelAset[] = await Promise.all(
    aset.map(async (a) => ({
      ...a,
      qr: await QRCode.toDataURL(bungkusKodeAset(a.kodeAset), {
        errorCorrectionLevel: "M",
        margin: 0,
        width: 240,
        color: { dark: "#14181f", light: "#ffffff" },
      }),
    })),
  );

  const berkas = await renderToBuffer(
    createElement(DokumenLabelAset, {
      label,
      dicetakPada: tanggalDanJamWib(new Date()),
    }) as unknown as ReactElement<DocumentProps>,
  );

  return new NextResponse(new Uint8Array(berkas), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${namaBerkas("label-aset", "pdf")}"`,
      "Cache-Control": "no-store",
    },
  });
}
