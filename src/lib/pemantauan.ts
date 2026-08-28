// -----------------------------------------------------------------------------
// Pemantauan harian dan mingguan untuk dasbor.
//
// Berisi pertanyaan-pertanyaan yang menyentuh basis data dan dipakai lebih dari
// satu halaman: siapa yang belum mengisi logbook pekan ini, apakah piket hari
// ini sudah diisi, laporan insiden mana yang masih menunggu. Perhitungan
// murninya tinggal di `logbook.ts` dan `piket.ts` supaya tetap dapat diuji
// tanpa basis data; di sini hanya kuerinya.
//
// Semua fungsi menjawab apa adanya. Squad yang belum mengisi disebut belum
// mengisi — tanpa masa tenggang diam-diam yang membuat penanda di dasbor
// terlambat sepekan dan kehilangan gunanya.
// -----------------------------------------------------------------------------

import type { Period } from "@prisma/client";

import { mingguKeDari } from "./logbook";
import { jadwalPiket, squadTerjadwal } from "./piket";
import { prisma } from "./prisma";
import { nomorHariWib, tanggalKalenderWib } from "./waktu";

export interface SquadPekanIni {
  id: string;
  kode: string;
  nama: string;
  sudahMengisi: boolean;
}

/**
 * Daftar seluruh squad beserta apakah logbooknya sudah terisi pekan ini.
 *
 * Mengembalikan seluruh squad, bukan hanya yang belum: dasbor perlu menyebut
 * jumlah keduanya, dan halaman logbook memakai daftar yang sama untuk
 * menandai. Menghitung dua kali dengan dua kueri berbeda adalah cara termudah
 * membuat dua angka yang tidak pernah cocok.
 */
export async function squadPadaPekan(
  periode: Period,
  sekarang: Date = new Date(),
): Promise<{ mingguKe: number; squad: SquadPekanIni[] }> {
  const mingguKe = mingguKeDari(sekarang, periode.tanggalMulai);

  const [squad, terisi] = await Promise.all([
    prisma.squad.findMany({ select: { id: true, kode: true, nama: true }, orderBy: { nama: "asc" } }),
    prisma.logbook.findMany({
      where: { periodId: periode.id, mingguKe },
      select: { squadId: true },
    }),
  ]);

  const sudah = new Set(terisi.map((l) => l.squadId));
  return {
    mingguKe,
    squad: squad.map((s) => ({ ...s, sudahMengisi: sudah.has(s.id) })),
  };
}

export interface PiketHariIni {
  /** Null pada hari yang memang tidak dijadwalkan, mis. Sabtu dan Minggu. */
  kodeSquad: string | null;
  namaSquad: string | null;
  sudahDiisi: boolean;
}

/** Apakah piket hari ini sudah dicatat, dan oleh squad mana seharusnya. */
export async function piketHariIni(sekarang: Date = new Date()): Promise<PiketHariIni> {
  const terjadwal = squadTerjadwal(jadwalPiket(), nomorHariWib(sekarang));
  if (!terjadwal) return { kodeSquad: null, namaSquad: null, sudahDiisi: false };

  const squad = await prisma.squad.findUnique({
    where: { kode: terjadwal.kodeSquad },
    select: { id: true, nama: true },
  });
  if (!squad) return { kodeSquad: terjadwal.kodeSquad, namaSquad: null, sudahDiisi: false };

  const catatan = await prisma.piketLog.findFirst({
    where: { tanggal: tanggalKalenderWib(sekarang), squadId: squad.id },
    select: { id: true },
  });

  return { kodeSquad: terjadwal.kodeSquad, namaSquad: squad.nama, sudahDiisi: catatan !== null };
}

/** Banyaknya laporan insiden yang belum selesai ditindaklanjuti. */
export async function insidenMenunggu(): Promise<{ jumlah: number; mendesak: number }> {
  const [jumlah, mendesak] = await Promise.all([
    prisma.incident.count({ where: { statusTindakLanjut: { not: "SELESAI" } } }),
    prisma.incident.count({
      where: {
        statusTindakLanjut: { not: "SELESAI" },
        jenis: { in: ["CEDERA", "KEBAKARAN"] },
      },
    }),
  ]);
  return { jumlah, mendesak };
}
