// -----------------------------------------------------------------------------
// Piket harian.
//
// Dua keputusan yang membentuk seluruh modul ini:
//
// 1. Checklist boleh disimpan walau belum semua butir tercentang. Memaksa 8
//    dari 8 tidak membuat laboratorium lebih bersih — ia hanya memastikan
//    seluruh catatan piket berbunyi 8 dari 8, termasuk pada hari yang
//    solder-nya memang lupa dicabut. Catatan yang selalu sempurna tidak dapat
//    dipakai memperbaiki apa pun.
// 2. `alatBelumKembali` tidak diketik petugas, melainkan dihitung dari daftar
//    peminjaman yang masih terbuka. Angka yang diketik tangan pada akhir hari
//    yang melelahkan selalu menjadi nol.
// -----------------------------------------------------------------------------

import { bacaDataCsv } from "./data-csv";

export interface ButirPiket {
  kode: string;
  butir: string;
  keterangan: string;
}

export interface BarisJadwal {
  hari: string;
  nomorHari: number;
  kodeSquad: string;
}

/** Jawaban checklist sebagaimana disimpan pada medan Json. */
export type JawabanChecklist = Record<string, boolean>;

export function butirPiket(): ButirPiket[] {
  return bacaDataCsv("checklist-piket.csv").map((b) => ({
    kode: b.kode ?? "",
    butir: b.butir ?? "",
    keterangan: b.keterangan ?? "",
  }));
}

/**
 * Hari yang dapat dijadwalkan piket: Senin sampai Sabtu. Minggu tidak.
 * Dipakai penyunting jadwal untuk menampilkan satu baris per hari.
 */
export const HARI_PIKET: { nomor: number; nama: string }[] = [
  { nomor: 1, nama: "Senin" },
  { nomor: 2, nama: "Selasa" },
  { nomor: 3, nama: "Rabu" },
  { nomor: 4, nama: "Kamis" },
  { nomor: 5, nama: "Jumat" },
  { nomor: 6, nama: "Sabtu" },
];

export function jadwalPiket(): BarisJadwal[] {
  return bacaDataCsv("jadwal-piket.csv").map((b) => ({
    hari: b.hari ?? "",
    nomorHari: Number(b.nomor_hari ?? 0),
    kodeSquad: b.kode_squad ?? "",
  }));
}

/**
 * Squad yang terjadwal piket pada hari itu.
 *
 * Mengembalikan null untuk hari yang memang tidak dijadwalkan — Sabtu, Minggu,
 * dan hari apa pun yang tidak tercantum di berkas jadwal. Hari tanpa jadwal
 * bukan pelanggaran, jadi pemanggilnya tidak boleh memperlakukannya sebagai
 * piket yang terlewat.
 */
export function squadTerjadwal(jadwal: BarisJadwal[], nomorHari: number): BarisJadwal | null {
  return jadwal.find((j) => j.nomorHari === nomorHari) ?? null;
}

/**
 * Menyeragamkan nilai checklist yang terbaca dari basis data.
 *
 * Medan Json menerima apa saja, termasuk bentuk lama dari versi sebelumnya dan
 * kode butir yang sudah dihapus dari CSV. Yang dikembalikan selalu satu entri
 * untuk setiap butir yang berlaku sekarang; butir yang tidak dikenal dibuang,
 * dan butir baru yang belum pernah ada di catatan lama terbaca sebagai belum
 * dicentang — bukan sebagai galat.
 */
export function bacaChecklist(nilai: unknown, butir: ButirPiket[]): JawabanChecklist {
  const sumber = (nilai ?? {}) as Record<string, unknown>;
  const hasil: JawabanChecklist = {};
  for (const b of butir) hasil[b.kode] = sumber[b.kode] === true;
  return hasil;
}

export function butirBelumDicentang(butir: ButirPiket[], jawaban: JawabanChecklist): ButirPiket[] {
  return butir.filter((b) => !jawaban[b.kode]);
}

/** Persentase butir yang tercentang, dibulatkan. Nol butir berarti nol persen. */
export function persenChecklist(butir: ButirPiket[], jawaban: JawabanChecklist): number {
  if (butir.length === 0) return 0;
  const tercentang = butir.filter((b) => jawaban[b.kode]).length;
  return Math.round((tercentang / butir.length) * 100);
}
