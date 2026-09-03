// -----------------------------------------------------------------------------
// Batas unggahan yang perlu diketahui kedua sisi.
//
// Dipisahkan dari `berkas.ts` karena berkas itu memakai `node:fs`: formulir di
// peramban tidak bisa mengimpornya tanpa menyeret modul Node ke dalam bundel.
// Angka yang sama harus muncul di petunjuk formulir dan di pemeriksaan peladen,
// dan satu-satunya cara memastikannya adalah menaruhnya di satu tempat.
// -----------------------------------------------------------------------------

export const UKURAN_MAKSIMAL = 8 * 1024 * 1024; // 8 MB

export const UKURAN_MAKSIMAL_MB = UKURAN_MAKSIMAL / 1024 / 1024;

/** Subfolder foto kondisi alat saat dipinjam dan saat dikembalikan. */
export const KELOMPOK_PEMINJAMAN = "peminjaman";

/**
 * Subfolder foto kartu identitas jaminan.
 *
 * Dipisahkan dari foto kondisi supaya penjagaannya bisa berbeda: foto kondisi
 * boleh dilihat siapa pun yang sudah masuk, sedangkan pindaian KTM/KTP hanya
 * boleh dilihat petugas yang memang mengurus peminjaman. Memisahkan berdasarkan
 * folder membuat penjagaan itu berlaku pada berkasnya sendiri — bukan bergantung
 * pada halaman mana yang kebetulan menautkannya.
 */
export const KELOMPOK_IDENTITAS = "identitas";

/** Subfolder foto laporan insiden. */
export const KELOMPOK_INSIDEN = "insiden";

/** Subfolder foto ruangan sebelum dan sesudah piket. */
export const KELOMPOK_PIKET = "piket";

/** Subfolder bukti kegiatan pada logbook riset mingguan. */
export const KELOMPOK_LOGBOOK = "logbook";
