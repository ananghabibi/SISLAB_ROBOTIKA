// -----------------------------------------------------------------------------
// GET /api/ekspor/rekap-pdf — rekap kontribusi sebagai PDF siap cetak.
// -----------------------------------------------------------------------------

import { createElement, type ReactElement } from "react";

import type { Prisma } from "@prisma/client";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

import { DokumenRekap } from "@/components/pdf/rekap-pdf";
import { namaBerkas } from "@/lib/ekspor";
import { periodeAktif, rekapKontribusi } from "@/lib/kontribusi";
import { saringanRekapKontribusi, wajibIzin } from "@/lib/penjaga";
import { prisma } from "@/lib/prisma";
import { tanggalDanJamWib, tanggalPendekWib } from "@/lib/waktu";

export const dynamic = "force-dynamic";
// Perenderan PDF memakai pustaka Node, bukan Edge.
export const runtime = "nodejs";

export async function GET(permintaan: Request) {
  const { pengguna } = await wajibIzin("ekspor", "baca");

  const idPeriode = new URL(permintaan.url).searchParams.get("periode");
  const periode = idPeriode
    ? await prisma.period.findUnique({ where: { id: idPeriode } })
    : await periodeAktif();

  if (!periode) {
    return NextResponse.json({ ok: false, pesan: "Periode tidak ditemukan." }, { status: 404 });
  }

  const rekap = await rekapKontribusi(
    periode,
    saringanRekapKontribusi(pengguna) as Prisma.UserWhereInput,
  );

  // `renderToBuffer` menuntut ReactElement<DocumentProps>, sedangkan pembungkus
  // kita menerima props miliknya sendiri lalu mengembalikan <Document>. Elemen
  // yang dihasilkan sudah benar; hanya tipenya yang perlu diyakinkan.
  const berkas = await renderToBuffer(
    createElement(DokumenRekap, {
      namaPeriode: periode.nama,
      rentang: `${tanggalPendekWib(periode.tanggalMulai)} – ${tanggalPendekWib(periode.tanggalSelesai)}`,
      ambangLulus: periode.ambangLulus,
      dicetakPada: tanggalDanJamWib(new Date()),
      dicetakOleh: pengguna.nama,
      rekap,
    }) as unknown as ReactElement<DocumentProps>,
  );

  return new NextResponse(new Uint8Array(berkas), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${namaBerkas(`rekap-kontribusi-${periode.nama}`, "pdf")}"`,
      "Cache-Control": "no-store",
    },
  });
}
