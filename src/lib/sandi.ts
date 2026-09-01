// -----------------------------------------------------------------------------
// Kata sandi bawaan untuk akun yang baru dibuat.
//
// Setiap akun lahir dengan kata sandi, supaya menambah anggota lewat web
// benar-benar selesai di web — tidak ada lagi langkah "lalu buka shell peladen
// dan jalankan npm run sandi" yang dulu memutus alurnya di tengah.
//
// Kata sandi bawaan itu sama untuk semua orang, dan justru karena itu ia tidak
// boleh cukup untuk apa pun selain menggantinya. Kalau ia cukup untuk membuka
// halaman absensi, siapa pun yang tahu satu kata itu dapat masuk sebagai orang
// lain dan menekan tombol hadir atas namanya — persis yang seluruh sistem ini
// dibangun untuk mencegah. Karena itu akun yang masih memakai kata sandi bawaan
// ditandai `wajibGantiSandi`, dan penjagaan di `penjaga.ts` hanya membukakan
// Dasbor dan Profil untuknya.
// -----------------------------------------------------------------------------

/** Panjang minimal kata sandi yang dipilih sendiri oleh anggota. */
export const PANJANG_SANDI_MINIMAL = 10;

/**
 * Dipakai bila `SANDI_BAWAAN_ANGGOTA` tidak disetel.
 *
 * Sengaja berupa kalimat perintah, bukan sesuatu yang tampak seperti kata sandi
 * sungguhan: yang menerimanya harus langsung mengerti bahwa ini titipan
 * sementara.
 */
export const SANDI_BAWAAN_CADANGAN = "silab-ganti-sandi-saya";

export function sandiBawaan(env: NodeJS.ProcessEnv = process.env): string {
  const disetel = (env.SANDI_BAWAAN_ANGGOTA ?? "").trim();
  return disetel.length >= PANJANG_SANDI_MINIMAL ? disetel : SANDI_BAWAAN_CADANGAN;
}

/**
 * Benar bila `SANDI_BAWAAN_ANGGOTA` disetel tetapi terlalu pendek untuk dipakai.
 *
 * Diamnya berbahaya: pengelola mengira sudah mengganti kata sandi bawaan,
 * padahal seluruh akun baru memakai cadangan yang tertulis di dalam kode ini.
 */
export function sandiBawaanDiabaikan(env: NodeJS.ProcessEnv = process.env): boolean {
  const disetel = (env.SANDI_BAWAAN_ANGGOTA ?? "").trim();
  return disetel.length > 0 && disetel.length < PANJANG_SANDI_MINIMAL;
}

/**
 * Alasan penolakan sebuah kata sandi baru, atau null bila boleh dipakai.
 *
 * Dipakai bersama oleh formulir ganti sandi dan skrip `npm run sandi`, supaya
 * aturannya tidak bercabang antara yang lewat web dan yang lewat peladen.
 */
export function alasanSandiDitolak(
  sandiBaru: string,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  if (sandiBaru.length < PANJANG_SANDI_MINIMAL) {
    return `Kata sandi baru minimal ${PANJANG_SANDI_MINIMAL} karakter.`;
  }
  if (sandiBaru === sandiBawaan(env)) {
    return "Kata sandi baru tidak boleh sama dengan kata sandi bawaan. Kata sandi bawaan diketahui pengelola dan tertulis di panduan.";
  }
  return null;
}
