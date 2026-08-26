// -----------------------------------------------------------------------------
// Penjagaan hak akses di sisi peladen.
//
// Middleware sudah menutup rute, tetapi middleware tidak tahu apa-apa tentang
// pemilik sebuah baris data. Setiap halaman, Server Action, dan Route Handler
// tetap wajib memanggil penjagaan dari berkas ini. Menyembunyikan tombol bukan
// pengamanan; yang mengamankan adalah pemeriksaan yang berjalan di peladen.
// -----------------------------------------------------------------------------

import { forbidden, unauthorized } from "next/navigation";
import type { Session } from "next-auth";

import { auth } from "@/auth";
import { bolehBaca, bolehHapus, bolehTulis, izinUntuk, type Modul } from "./rbac";

export type Pengguna = Session["user"];

export async function sesiSekarang(): Promise<Session | null> {
  return auth();
}

/** Memastikan ada sesi yang sah. Menghasilkan 401 bila tidak. */
export async function wajibMasuk(): Promise<Pengguna> {
  const sesi = await auth();
  if (!sesi?.user?.id) unauthorized();
  return sesi.user;
}

/**
 * Memastikan pengguna berhak atas sebuah modul. Menghasilkan 403 bila tidak.
 * Kembaliannya adalah pengguna beserta izinnya, supaya halaman tidak perlu
 * memanggil matriks untuk kedua kalinya.
 */
export async function wajibIzin(modul: Modul, aksi: "baca" | "tulis" | "hapus" = "baca") {
  const pengguna = await wajibMasuk();
  const izin = izinUntuk(pengguna.role, modul);

  const berhak =
    aksi === "baca"
      ? bolehBaca(pengguna.role, modul)
      : aksi === "tulis"
        ? bolehTulis(pengguna.role, modul)
        : bolehHapus(pengguna.role, modul);

  if (!berhak) forbidden();
  return { pengguna, izin };
}

/** Menjaga rute yang hanya boleh dibuka satu peran tertentu. */
export async function wajibPeran(...peran: Pengguna["role"][]): Promise<Pengguna> {
  const pengguna = await wajibMasuk();
  if (!peran.includes(pengguna.role)) forbidden();
  return pengguna;
}

/**
 * Menentukan apakah `pengguna` boleh melihat data milik `pemilik`.
 *
 * Dipakai untuk memenuhi kriteria "anggota tidak bisa melihat data anggota lain
 * lewat API mana pun": setiap kueri per-orang harus melewati fungsi ini, bukan
 * mengandalkan penyaringan di antarmuka.
 */
export function bolehLihatDataOrang(
  pengguna: Pengguna,
  modul: Modul,
  pemilik: { id: string; squadId: string | null },
): boolean {
  const izin = izinUntuk(pengguna.role, modul);
  if (izin.baca === "SEMUA") return true;
  if (izin.baca === "TIDAK") return false;

  if (pemilik.id === pengguna.id) return true;
  // Ketua squad melihat squadnya; anggota biasa hanya dirinya sendiri.
  if (pengguna.role === "KETUA_SQUAD" && pengguna.squadId) {
    return pemilik.squadId === pengguna.squadId;
  }
  return false;
}

/**
 * Penyaring daftar anggota sesuai lingkup peran (modul `master_anggota`).
 *
 * Legenda SPEC menulis "Bs = baca miliknya/squadnya saja". Untuk daftar nama,
 * lingkup itu diambil sebagai squadnya: mengetahui siapa saja teman satu squad
 * memang bagian dari bekerja di squad. Angka per-orang yang sensitif — skor
 * kontribusi — tetap memakai `bolehLihatDataOrang` yang lebih ketat.
 */
export function saringanDaftarAnggota(pengguna: Pengguna) {
  const izin = izinUntuk(pengguna.role, "master_anggota");
  if (izin.baca === "SEMUA") return {};
  if (izin.baca === "TIDAK") return { id: "__tidak-ada__" };
  return pengguna.squadId ? { squadId: pengguna.squadId } : { id: pengguna.id };
}
