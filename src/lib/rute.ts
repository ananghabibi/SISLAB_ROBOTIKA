// -----------------------------------------------------------------------------
// Peta rute ke modul hak akses.
//
// Satu daftar ini dipakai dua kali: oleh middleware untuk menutup rute di sisi
// peladen, dan oleh menu samping untuk menentukan apa yang ditampilkan. Karena
// sumbernya sama, menu tidak akan pernah menawarkan halaman yang lalu ditolak.
// -----------------------------------------------------------------------------

import type { Role } from "@prisma/client";
import { bolehBaca, bolehTulis, type Modul } from "./rbac";

export interface AturanRute {
  awalan: string;
  modul: Modul;
  /** Rute penulisan (mis. formulir ubah) butuh izin tulis, bukan sekadar baca. */
  butuh: "baca" | "tulis";
}

/**
 * Diurutkan dari yang paling khusus ke yang paling umum: pencocokan memakai
 * aturan pertama yang cocok, sehingga /anggota/baru bisa lebih ketat daripada
 * /anggota.
 */
export const ATURAN_RUTE: AturanRute[] = [
  { awalan: "/anggota/baru", modul: "master_anggota", butuh: "tulis" },
  { awalan: "/anggota", modul: "master_anggota", butuh: "baca" },
  { awalan: "/peran", modul: "peran_hak_akses", butuh: "tulis" },
  { awalan: "/absensi/manual", modul: "absensi_manual", butuh: "tulis" },
  { awalan: "/absensi/rekap", modul: "rekap_absensi", butuh: "baca" },
  { awalan: "/absensi", modul: "absensi_sendiri", butuh: "baca" },
  { awalan: "/inventaris", modul: "inventaris", butuh: "baca" },
  { awalan: "/peminjaman", modul: "peminjaman", butuh: "baca" },
  { awalan: "/piket", modul: "piket", butuh: "baca" },
  { awalan: "/logbook", modul: "logbook", butuh: "baca" },
  { awalan: "/insiden", modul: "insiden", butuh: "baca" },
  { awalan: "/tamu", modul: "insiden", butuh: "baca" },
  { awalan: "/periode", modul: "periode_target", butuh: "tulis" },
  { awalan: "/skk", modul: "skk", butuh: "baca" },
  { awalan: "/audit", modul: "audit_log", butuh: "baca" },
  { awalan: "/ekspor", modul: "ekspor", butuh: "baca" },
];

/** Rute yang boleh dibuka tanpa login sama sekali. */
export const RUTE_PUBLIK = ["/masuk", "/display", "/403", "/api/auth", "/api/display", "/api/cron"];

export function aturanUntukJalur(jalur: string): AturanRute | undefined {
  return ATURAN_RUTE.find(
    (aturan) => jalur === aturan.awalan || jalur.startsWith(`${aturan.awalan}/`),
  );
}

export function peranBolehMembuka(peran: Role, jalur: string): boolean {
  const aturan = aturanUntukJalur(jalur);
  if (!aturan) return true; // Rute umum: /, /dasbor, /profil.
  return aturan.butuh === "tulis"
    ? bolehTulis(peran, aturan.modul)
    : bolehBaca(peran, aturan.modul);
}
