// -----------------------------------------------------------------------------
// Menu navigasi.
//
// Daftar ini hanya menentukan APA YANG TAMPAK. Yang menentukan apa yang boleh
// DIBUKA tetap `src/lib/rute.ts` dan penjagaan di setiap halaman. Keduanya
// membaca matriks yang sama, jadi menu tidak pernah menawarkan pintu terkunci.
// -----------------------------------------------------------------------------

import type { Role } from "@prisma/client";

import { peranBolehMembuka } from "./rute";

export interface ButirMenu {
  label: string;
  href: string;
  kelompok: "Harian" | "Pengelolaan" | "Pengawasan";
  /** Milestone yang membangunnya; dipakai halaman rintisan agar jujur soal status. */
  milestone: number;
  /** Sudah berfungsi, bukan halaman rintisan. */
  selesai: boolean;
}

export const MENU: ButirMenu[] = [
  { label: "Dasbor", href: "/dasbor", kelompok: "Harian", milestone: 1, selesai: true },
  { label: "Absensi Saya", href: "/absensi", kelompok: "Harian", milestone: 2, selesai: true },
  { label: "Rekap Absensi", href: "/absensi/rekap", kelompok: "Harian", milestone: 3, selesai: true },
  { label: "Absensi Manual", href: "/absensi/manual", kelompok: "Harian", milestone: 2, selesai: true },
  { label: "Logbook Riset", href: "/logbook", kelompok: "Harian", milestone: 5, selesai: true },
  { label: "Piket", href: "/piket", kelompok: "Harian", milestone: 5, selesai: true },
  { label: "Laporan Insiden", href: "/insiden", kelompok: "Harian", milestone: 5, selesai: true },
  { label: "Buku Tamu", href: "/tamu", kelompok: "Harian", milestone: 5, selesai: true },

  { label: "Anggota", href: "/anggota", kelompok: "Pengelolaan", milestone: 1, selesai: true },
  { label: "Peran & Hak Akses", href: "/peran", kelompok: "Pengelolaan", milestone: 1, selesai: true },
  { label: "Inventaris", href: "/inventaris", kelompok: "Pengelolaan", milestone: 4, selesai: true },
  { label: "Peminjaman", href: "/peminjaman", kelompok: "Pengelolaan", milestone: 4, selesai: true },
  { label: "Periode & Target", href: "/periode", kelompok: "Pengelolaan", milestone: 3, selesai: true },

  { label: "Surat Kontribusi", href: "/skk", kelompok: "Pengawasan", milestone: 6, selesai: true },
  { label: "Audit Log", href: "/audit", kelompok: "Pengawasan", milestone: 6, selesai: true },
  { label: "Ekspor Data", href: "/ekspor", kelompok: "Pengawasan", milestone: 3, selesai: true },
];

export function menuUntukPeran(peran: Role): ButirMenu[] {
  return MENU.filter((butir) => peranBolehMembuka(peran, butir.href));
}

export function kelompokMenu(peran: Role) {
  const terlihat = menuUntukPeran(peran);
  return (["Harian", "Pengelolaan", "Pengawasan"] as const)
    .map((kelompok) => ({ kelompok, butir: terlihat.filter((b) => b.kelompok === kelompok) }))
    .filter((k) => k.butir.length > 0);
}
