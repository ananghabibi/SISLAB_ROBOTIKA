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
