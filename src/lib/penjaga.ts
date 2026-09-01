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
import { prisma } from "./prisma";
import { bolehBaca, bolehHapus, bolehTulis, izinUntuk, type Modul } from "./rbac";

// Kebijakan pelingkupan tinggal di modul tersendiri yang tidak menyentuh
// Auth.js, supaya dapat diuji tanpa menyalakan peladen. Diteruskan dari sini
// agar halaman cukup mengimpor satu modul penjagaan.
export {
  bolehLihatDataOrang,
  saringanAuditLog,
  saringanDaftarAnggota,
  saringanInsiden,
  saringanLogbook,
  saringanPeminjaman,
  saringanPiket,
  saringanRekapKontribusi,
  type PenggunaLingkup,
} from "./lingkup";

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
  await wajibSandiSendiri(pengguna.id);
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

/**
 * Menutup seluruh modul untuk akun yang masih memakai kata sandi bawaan.
 *
 * Kata sandi bawaan sama untuk semua orang. Selama ia masih terpasang, tidak
 * ada cara membedakan pemilik akun dari siapa pun yang membaca panduan
 * instalasi — jadi akun itu belum boleh dipakai untuk mencatat apa pun,
 * terutama absensi.
 *
 * Sengaja dipasang di `wajibIzin`, bukan di `wajibMasuk`: Dasbor dan Profil
 * memakai `wajibMasuk` dan karenanya tetap terbuka. Orangnya masih dapat
 * masuk, membaca peringatan di dasbor, lalu mengganti sandinya. Yang tertutup
 * hanyalah semua yang menulis atau membaca data laboratorium.
 *
 * Pemeriksaannya membaca basis data, bukan token sesi. Token disegarkan
 * berkala; kalau benderanya ikut menumpang di sana, orang yang baru saja
 * mengganti sandi masih tertahan sampai penyegaran berikutnya, dan dari
 * kursinya itu tampak seperti aplikasi yang rusak.
 */
async function wajibSandiSendiri(idPengguna: string): Promise<void> {
  const akun = await prisma.user.findUnique({
    where: { id: idPengguna },
    select: { wajibGantiSandi: true },
  });
  if (akun?.wajibGantiSandi) redirect("/profil");
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
