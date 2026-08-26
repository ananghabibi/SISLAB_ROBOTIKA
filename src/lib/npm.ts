// -----------------------------------------------------------------------------
// Turunan data dari NPM (SPEC bagian 9).
//
// NPM di UNISMA berbentuk 11 digit: AAA PPPPP UUU
//   AAA   tiga digit pertama  -> angkatan (221 = 2021 ... 225 = 2025)
//   PPPPP lima digit prodi    -> tiga digit terakhirnya menandai program studi
//   UUU   nomor urut
//
// Contoh: 22301053005 -> angkatan 2023, kode prodi "053" (Teknik Elektro).
//
// Semua turunan di sini hanya berlaku sebagai NILAI AWAL. Berkas
// `data/seed-data.csv` boleh menimpanya, karena ada saja NPM yang menyimpang
// dan nama pun wajib dicocokkan ke SIAKAD sebelum dipakai di produksi.
// -----------------------------------------------------------------------------

import type { Jenjang } from "@prisma/client";

export const KODE_PRODI: Record<string, { prodi: string; fakultas: string }> = {
  "053": { prodi: "Teknik Elektro", fakultas: "Teknik" },
  "054": { prodi: "Teknik Informatika", fakultas: "Teknik" },
  "041": { prodi: "Peternakan", fakultas: "Peternakan" },
  "043": { prodi: "Peternakan", fakultas: "Peternakan" },
  "061": { prodi: "Biologi", fakultas: "MIPA" },
};

export function npmValid(npm: string): boolean {
  return /^\d{11}$/.test(npm);
}

export function kodeProdiDariNpm(npm: string): string | null {
  if (!npmValid(npm)) return null;
  return npm.slice(5, 8);
}

export function prodiDariNpm(npm: string): { prodi: string; fakultas: string } | null {
  const kode = kodeProdiDariNpm(npm);
  if (!kode) return null;
  return KODE_PRODI[kode] ?? null;
}

export function angkatanDariNpm(npm: string): number | null {
  if (!npmValid(npm)) return null;
  // "223" -> 2023. Digit pertama menandai dasawarsa 20xx, dua sisanya tahunnya.
  const tiga = Number(npm.slice(0, 3));
  const tahun = 2000 + (tiga % 100);
  return tahun >= 2000 && tahun <= 2099 ? tahun : null;
}

/**
 * Jenjang keanggotaan menurut angkatan (SPEC bagian 9):
 * 2025 = MUDA, 2023–2024 = MADYA, 2021–2022 = UTAMA.
 *
 * Angkatan yang lebih baru dari 2025 diperlakukan MUDA, yang lebih lama dari
 * 2021 diperlakukan UTAMA — supaya periode berikutnya tidak perlu ubah kode.
 */
export function jenjangDariAngkatan(angkatan: number | null): Jenjang {
  if (angkatan === null) return "MUDA";
  if (angkatan >= 2025) return "MUDA";
  if (angkatan >= 2023) return "MADYA";
  return "UTAMA";
}

/**
 * Semester berjalan pada semester ganjil tahun ajaran `tahunAjaran`.
 * Angkatan 2025 pada TA 2026/2027 berada di semester 3.
 */
export function semesterBerjalan(angkatan: number | null, tahunAjaran: number): number | null {
  if (angkatan === null) return null;
  const semester = (tahunAjaran - angkatan) * 2 + 1;
  return semester > 0 ? semester : null;
}
