// -----------------------------------------------------------------------------
// Penjagaan hak akses di sisi peladen.
//
// Middleware sudah menutup rute, tetapi middleware tidak tahu apa-apa tentang
// pemilik sebuah baris data. Setiap halaman, Server Action, dan Route Handler
// tetap wajib memanggil penjagaan dari berkas ini. Menyembunyikan tombol bukan
// pengamanan; yang mengamankan adalah pemeriksaan yang berjalan di peladen.
// -----------------------------------------------------------------------------

import { forbidden, redirect } from "next/navigation";
import type { Session } from "next-auth";

import { auth } from "@/auth";
import { bolehBaca, bolehHapus, bolehTulis, izinUntuk, type Modul } from "./rbac";

export type Pengguna = Session["user"];

export async function sesiSekarang(): Promise<Session | null> {
  return auth();
}

/** Memastikan ada sesi yang sah, atau mengantar pengguna ke halaman masuk. */
export async function wajibMasuk(): Promise<Pengguna> {
  const sesi = await auth();
  if (!sesi?.user?.id) redirect("/masuk");
  return sesi.user;
}

/**
 * Memastikan pengguna berhak atas sebuah modul.
 *
 * Penolakan pada tingkat RUTE sudah dihentikan middleware dengan status 403
 * yang sebenarnya, jadi penjagaan ini adalah lapis kedua: ia menangkap halaman
 * yang lupa didaftarkan di `src/lib/rute.ts`, dan penolakan yang hanya bisa
 * diputuskan setelah data dibaca. Kembaliannya adalah pengguna beserta izinnya,
 * supaya halaman tidak perlu memanggil matriks untuk kedua kalinya.
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

  if (!berhak) tolakAkses();
  return { pengguna, izin };
}

/** Menjaga rute yang hanya boleh dibuka satu peran tertentu. */
export async function wajibPeran(...peran: Pengguna["role"][]): Promise<Pengguna> {
  const pengguna = await wajibMasuk();
  if (!peran.includes(pengguna.role)) tolakAkses();
  return pengguna;
}

/**
 * Menghentikan render dengan jawaban 403 yang sebenarnya.
 *
 * Memakai `forbidden()` dari next/navigation, yang merender
 * `src/app/forbidden.tsx`. Pengalihan tidak dipakai di sini karena ia akan
 * menjawab 307 lalu 200 — dari luar, penolakan jadi tampak seperti
 * keberhasilan.
 */
export function tolakAkses(): never {
  forbidden();
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
