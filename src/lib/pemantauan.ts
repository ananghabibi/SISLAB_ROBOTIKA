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
  /** Id squad terjadwal, dipakai formulir sebagai pilihan bawaan. */
  idSquad: string | null;
  sudahDiisi: boolean;
}

/** Apakah piket hari ini sudah dicatat, dan oleh squad mana seharusnya. */
export async function piketHariIni(sekarang: Date = new Date()): Promise<PiketHariIni> {
  // Jadwal berlaku dibaca dari basis data (tabel jadwal_piket), bukan dari CSV:
  // ia dapat diubah dari antarmuka oleh Kepala Lab dan Koordinator Pengembangan.
  const baris = await prisma.jadwalPiket.findUnique({
    where: { hari: nomorHariWib(sekarang) },
    include: { squad: { select: { id: true, nama: true, kode: true } } },
  });
  if (!baris?.squad) return { kodeSquad: null, namaSquad: null, idSquad: null, sudahDiisi: false };

  const catatan = await prisma.piketLog.findFirst({
    where: { tanggal: tanggalKalenderWib(sekarang), squadId: baris.squad.id },
    select: { id: true },
  });

  return {
    kodeSquad: baris.squad.kode,
    namaSquad: baris.squad.nama,
    idSquad: baris.squad.id,
    sudahDiisi: catatan !== null,
  };
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

/**
 * Banyaknya catatan absensi yang jatuh di LUAR rentang periode aktif.
 *
 * Dipakai menerangkan rekap yang menunjukkan nol padahal absensinya berhasil.
 * Menyebut angkanya membuat sebabnya tidak perlu ditebak: bukan absensinya
 * yang gagal tersimpan, melainkan tanggalnya yang berada di luar periode.
 */
export async function absensiDiLuarPeriode(periode: Period): Promise<number> {
  return prisma.attendance.count({
    where: {
      dibatalkan: false,
      OR: [
        { tanggal: { lt: periode.tanggalMulai } },
        { tanggal: { gt: periode.tanggalSelesai } },
      ],
    },
  });
}
