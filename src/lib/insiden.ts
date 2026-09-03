// -----------------------------------------------------------------------------
// Laporan insiden dan nyaris celaka.
//
// Modul ini sengaja dibuat paling mudah dipakai di seluruh sistem: siapa pun
// boleh melapor, tidak ada persetujuan, dan tidak ada satu pun medan yang
// menuntut orang mengaku salah. Laporan nyaris celaka hanya masuk kalau
// melapor lebih murah daripada diam — dan yang pertama kali hilang saat
// formulirnya merepotkan justru laporan yang paling berharga: yang belum
// menimbulkan korban.
//
// Karena itu pula tidak ada tombol hapus. Laporan yang sudah masuk hanya
// berubah status tindak lanjutnya.
// -----------------------------------------------------------------------------

import type { JenisInsiden, StatusTindakLanjut } from "@prisma/client";

export const JENIS_INSIDEN = [
  "NYARIS_CELAKA",
  "CEDERA",
  "KEBAKARAN",
  "KERUSAKAN_ALAT",
  "LAINNYA",
] as const satisfies readonly JenisInsiden[];

export const LABEL_JENIS_INSIDEN: Record<JenisInsiden, string> = {
  NYARIS_CELAKA: "Nyaris celaka",
  CEDERA: "Cedera",
  KEBAKARAN: "Kebakaran",
  KERUSAKAN_ALAT: "Kerusakan alat",
  LAINNYA: "Lainnya",
};

export const STATUS_TINDAK_LANJUT = [
  "BARU",
  "DITINJAU",
  "DITANGANI",
  "SELESAI",
] as const satisfies readonly StatusTindakLanjut[];

export const LABEL_STATUS_TINDAK_LANJUT: Record<StatusTindakLanjut, string> = {
  BARU: "Baru",
  DITINJAU: "Ditinjau",
  DITANGANI: "Ditangani",
  SELESAI: "Selesai",
};

/** Benar bila teks ini salah satu status tindak lanjut yang sah. */
export function statusTindakLanjutSah(nilai: unknown): nilai is StatusTindakLanjut {
  return typeof nilai === "string" && STATUS_TINDAK_LANJUT.includes(nilai as StatusTindakLanjut);
}

/**
 * Jenis yang menuntut Kepala Laboratorium tahu hari itu juga.
 *
 * Dipakai menonjolkan laporan di dasbor, bukan mengirim pesan ke luar sistem:
 * notifikasi WhatsApp dan bot memang tidak dibangun (SPEC bagian 10).
 */
export function mendesak(jenis: JenisInsiden): boolean {
  return jenis === "CEDERA" || jenis === "KEBAKARAN";
}

/** Laporan yang masih menunggu seseorang, apa pun jenisnya. */
export function belumSelesai(status: StatusTindakLanjut): boolean {
  return status !== "SELESAI";
}

/** Warna badge status, supaya halaman dan dasbor tidak memilih sendiri-sendiri. */
export function ragamStatus(
  status: StatusTindakLanjut,
): "netral" | "utama" | "berhasil" | "peringatan" | "bahaya" {
  switch (status) {
    case "BARU":
      return "bahaya";
    case "DITINJAU":
      return "peringatan";
    case "DITANGANI":
      return "utama";
    case "SELESAI":
      return "berhasil";
  }
}
