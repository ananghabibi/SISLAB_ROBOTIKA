// -----------------------------------------------------------------------------
// Keadaan periode terhadap hari ini.
//
// Rekap kontribusi hanya menghitung absensi yang tanggalnya berada di dalam
// rentang periode aktif. Itu benar — tetapi diam soal itu adalah salah satu
// kesalahan paling mahal yang bisa dilakukan sistem ini: seseorang absen,
// absensinya berhasil, lalu rekapnya tetap menunjukkan nol. Yang terlihat
// olehnya adalah aplikasi yang rusak, dan yang sebenarnya terjadi adalah
// periode aktif yang belum dimulai atau sudah lewat.
//
// Karena itu keadaannya dihitung terpisah dan disebutkan terang-terangan di
// halaman rekap dan di dasbor. Angka nol yang tidak dijelaskan akan dicari
// sebabnya di tempat yang salah.
// -----------------------------------------------------------------------------

import type { Period } from "@prisma/client";

import { tanggalKalenderWib } from "./waktu";

export type KeadaanPeriode = "BELUM_MULAI" | "BERJALAN" | "SUDAH_SELESAI";

/**
 * Membandingkan hari ini dengan rentang periode, memakai tanggal kalender WIB.
 *
 * Perbandingan tanggal, bukan perbandingan instan: `tanggalMulai` dan
 * `tanggalSelesai` adalah medan bertanggal murni, dan hari terakhir periode
 * tetap termasuk ke dalam periode sampai hari itu berakhir.
 */
export function keadaanPeriode(
  periode: Pick<Period, "tanggalMulai" | "tanggalSelesai">,
  sekarang: Date = new Date(),
): KeadaanPeriode {
  const hariIni = tanggalKalenderWib(sekarang).getTime();
  if (hariIni < periode.tanggalMulai.getTime()) return "BELUM_MULAI";
  if (hariIni > periode.tanggalSelesai.getTime()) return "SUDAH_SELESAI";
  return "BERJALAN";
}

/**
 * Kalimat penjelas untuk keadaan yang bukan BERJALAN.
 *
 * Mengembalikan null saat periodenya memang sedang berjalan — tidak ada yang
 * perlu dijelaskan, dan peringatan yang selalu muncul akan berhenti dibaca.
 */
export function penjelasanPeriode(
  keadaan: KeadaanPeriode,
  jumlahDiLuar: number,
): string | null {
  if (keadaan === "BERJALAN") return null;

  const catatan =
    jumlahDiLuar > 0
      ? ` Ada ${jumlahDiLuar} catatan absensi di luar rentang itu — termasuk yang dicatat hari ini — dan semuanya belum ikut dihitung.`
      : "";

  return keadaan === "BELUM_MULAI"
    ? `Periode aktif BELUM DIMULAI. Rekap hanya menghitung absensi yang tanggalnya berada di dalam rentang periode, jadi angkanya masih nol.${catatan}`
    : `Periode aktif SUDAH BERAKHIR. Absensi yang dicatat setelah tanggal selesai tidak ikut dihitung.${catatan}`;
}
