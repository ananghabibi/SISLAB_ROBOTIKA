// -----------------------------------------------------------------------------
// Pelingkupan data per peran.
//
// Menjawab satu pertanyaan: dari seluruh baris yang ada, mana yang boleh dilihat
// orang ini? Berdiri sendiri tanpa menyentuh Auth.js maupun Prisma, supaya
// kebijakan sepenting ini bisa diuji tanpa perlu menyalakan peladen sama sekali.
//
// Bentuk kembaliannya adalah klausa `where` Prisma, sehingga pembatasannya
// terjadi di dalam kueri — bukan dengan mengambil semua baris lalu menyaringnya
// di memori, yang mudah terlupa di satu halaman dan bocor di situ.
// -----------------------------------------------------------------------------

import type { Role } from "@prisma/client";

import { izinUntuk, type Modul } from "./rbac";

/** Bagian pengguna yang menentukan lingkupnya. */
export interface PenggunaLingkup {
  id: string;
  role: Role;
  squadId: string | null;
}

/** Klausa yang tidak akan pernah cocok dengan baris mana pun. */
const TIDAK_SATU_PUN = { id: "__tidak-ada__" } as const;

/**
 * Penyaring daftar anggota (modul `master_anggota`).
 *
 * Legenda SPEC menulis "Bs = baca miliknya/squadnya saja". Untuk daftar nama,
 * lingkup itu diambil sebagai squadnya: mengetahui siapa saja teman satu squad
 * memang bagian dari bekerja di squad.
 */
export function saringanDaftarAnggota(pengguna: PenggunaLingkup) {
  const izin = izinUntuk(pengguna.role, "master_anggota");
  if (izin.baca === "SEMUA") return {};
  if (izin.baca === "TIDAK") return TIDAK_SATU_PUN;
  return pengguna.squadId ? { squadId: pengguna.squadId } : { id: pengguna.id };
}

/**
 * Penyaring rekap kontribusi (modul `rekap_absensi`).
 *
 * Lebih ketat daripada daftar anggota: di sini "SENDIRI" untuk seorang ANGGOTA
 * benar-benar berarti dirinya saja. Skor kontribusi adalah penilaian pribadi
 * yang berujung pada Surat Keterangan Kontribusi, dan SPEC menuntut "anggota
 * tidak bisa melihat skor anggota lain lewat API mana pun".
 *
 * Ketua squad tetap melihat squadnya, karena memimpin squad memang menuntut
 * mengetahui siapa yang tertinggal.
 */
export function saringanRekapKontribusi(pengguna: PenggunaLingkup) {
  const izin = izinUntuk(pengguna.role, "rekap_absensi");
  if (izin.baca === "SEMUA") return {};
  if (izin.baca === "TIDAK") return TIDAK_SATU_PUN;
  if (pengguna.role === "KETUA_SQUAD" && pengguna.squadId) {
    return { squadId: pengguna.squadId };
  }
  return { id: pengguna.id };
}

/**
 * Penyaring daftar peminjaman (modul `peminjaman`).
 *
 * Bentuknya berbeda dari dua penyaring di atas karena yang disaring bukan tabel
 * anggota melainkan tabel pinjaman: pembatasannya jatuh pada `peminjamId`.
 * Seorang ANGGOTA hanya melihat alat yang ia pinjam sendiri — bukan alat yang
 * dipinjam teman satu squadnya, karena tanggung jawab atas alat melekat pada
 * satu orang, bukan pada squad.
 */
export function saringanPeminjaman(pengguna: PenggunaLingkup) {
  const izin = izinUntuk(pengguna.role, "peminjaman");
  if (izin.baca === "SEMUA") return {};
  if (izin.baca === "TIDAK") return { peminjamId: "__tidak-ada__" };
  return { peminjamId: pengguna.id };
}

/**
 * Apakah `pengguna` boleh melihat data milik `pemilik` pada sebuah modul.
 *
 * Dipakai untuk penjagaan per baris, misalnya saat seseorang menebak id anggota
 * lain dan membukanya lewat URL.
 */
export function bolehLihatDataOrang(
  pengguna: PenggunaLingkup,
  modul: Modul,
  pemilik: { id: string; squadId: string | null },
): boolean {
  const izin = izinUntuk(pengguna.role, modul);
  if (izin.baca === "SEMUA") return true;
  if (izin.baca === "TIDAK") return false;

  if (pemilik.id === pengguna.id) return true;
  if (pengguna.role === "KETUA_SQUAD" && pengguna.squadId) {
    return pemilik.squadId === pengguna.squadId;
  }
  return false;
}
