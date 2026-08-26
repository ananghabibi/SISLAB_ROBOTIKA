// -----------------------------------------------------------------------------
// GET /api/ekspor/rekap — rekap kontribusi sebagai CSV.
//
// Salah satu ukuran keberhasilan sistem ini adalah data satu tahun dapat
// diekspor utuh dan diserahkan kepada Program Studi bila diaudit
// (SPEC bagian 11 butir 4).
// -----------------------------------------------------------------------------

import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { berkasCsv, namaBerkas } from "@/lib/ekspor";
import { periodeAktif, rekapKontribusi } from "@/lib/kontribusi";
import { prisma } from "@/lib/prisma";
import { saringanRekapKontribusi, wajibIzin } from "@/lib/penjaga";
import { LABEL_PERAN } from "@/lib/rbac";
import { tanggalPendekWib } from "@/lib/waktu";

export const dynamic = "force-dynamic";

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

  const csv = berkasCsv(
    [
      "Nama",
      "NPM",
      "Peran",
      "Squad",
      "Fakultas",
      "Hari hadir",
      "Persen hadir",
      "Total jam",
      "Sesi berbagi",
      "Piket",
      "Entri logbook",
      "Alat belum kembali",
      "Skor",
      "Status",
    ],
    rekap.map((r) => [
      r.user.nama,
      r.user.npm ?? "",
      LABEL_PERAN[r.user.role],
      r.user.squad?.nama ?? "",
      r.user.fakultas,
      r.komponen.hariHadir,
      r.rincian.persenHadir,
      r.totalJam,
      r.komponen.sesiBerbagi,
      r.komponen.piket,
      r.komponen.entriLogbook,
      r.komponen.alatBelumKembali,
      r.rincian.skor,
      r.rincian.lulus ? "LULUS" : "BELUM_LULUS",
    ]),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${namaBerkas(`rekap-kontribusi-${periode.nama}`, "csv")}"`,
      "Cache-Control": "no-store",
      "X-Periode": tanggalPendekWib(periode.tanggalMulai),
    },
  });
}
