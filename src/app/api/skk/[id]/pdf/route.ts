// -----------------------------------------------------------------------------
// GET /api/skk/<id>/pdf — lembar Surat Keterangan Kontribusi.
//
// Dirender dari `snapshotJson` saja. Tidak ada satu pun angka yang dihitung
// ulang di sini, dan itu disengaja: surat yang sudah terbit harus tetap sama
// isinya berapa kali pun diunduh, walau data absensinya dikoreksi sesudahnya.
// -----------------------------------------------------------------------------

import { createElement, type ReactElement } from "react";

import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

import { DokumenSkk } from "@/components/pdf/skk-pdf";
import { bolehLihatDataOrang, wajibIzin } from "@/lib/penjaga";
import { prisma } from "@/lib/prisma";
import { bacaSnapshot } from "@/lib/skk-terbit";
import { tanggalPanjangWib } from "@/lib/waktu";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_permintaan: Request, { params }: { params: Promise<{ id: string }> }) {
  const { pengguna } = await wajibIzin("skk", "baca");
  const { id } = await params;

  const skk = await prisma.skk.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, nama: true, squadId: true } },
      diterbitkanOleh: { select: { nama: true } },
    },
  });
  if (!skk) {
    return NextResponse.json({ ok: false, pesan: "Surat tidak ditemukan." }, { status: 404 });
  }

  // Anggota hanya boleh mengunduh suratnya sendiri. Tanpa penjagaan per baris
  // ini, id surat yang tertebak membuka surat orang lain lengkap dengan
  // seluruh angkanya.
  if (!bolehLihatDataOrang(pengguna, "skk", skk.user)) {
    return NextResponse.json({ ok: false, pesan: "Bukan surat Anda." }, { status: 403 });
  }

  const isi = bacaSnapshot(skk.snapshotJson);
  if (!isi) {
    return NextResponse.json(
      { ok: false, pesan: "Isi surat tidak terbaca. Hubungi Kepala Laboratorium." },
      { status: 500 },
    );
  }

  const berkas = await renderToBuffer(
    createElement(DokumenSkk, {
      nomor: skk.nomor,
      tanggalTerbit: tanggalPanjangWib(skk.tanggalTerbit),
      isi,
      namaKepalaLab: skk.diterbitkanOleh.nama,
    }) as ReactElement<DocumentProps>,
  );

  const namaBerkas = `SKK-${skk.nomor.replaceAll("/", "-")}.pdf`;
  return new NextResponse(new Uint8Array(berkas), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${namaBerkas}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
