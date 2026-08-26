// -----------------------------------------------------------------------------
// Pencatatan nonce token QR yang sudah dipakai.
// -----------------------------------------------------------------------------

import { prisma } from "./prisma";

/** Berapa lama jejak nonce disimpan sebelum dibuang (SPEC bagian 3, lapis 3). */
export const MENIT_SIMPAN_NONCE = 5;

/**
 * Mengklaim sebuah nonce untuk seorang pengguna.
 *
 * Mengembalikan false bila pengguna itu sudah pernah memakai token yang sama.
 * Klaim dilakukan dengan menyisipkan baris ber-indeks unik, bukan dengan
 * "periksa dulu lalu tulis" — dua permintaan bersamaan dari ponsel yang sama
 * (tombol ditekan dua kali) tidak boleh sama-sama lolos.
 */
export async function klaimNonce(nonce: string, userId: string): Promise<boolean> {
  try {
    await prisma.qrNonce.create({ data: { nonce, userId } });
    return true;
  } catch {
    return false;
  }
}

/**
 * Membuang jejak nonce yang sudah lewat masa simpannya.
 *
 * Dipanggil sambil lalu dari endpoint absensi. Kegagalannya tidak pernah
 * membatalkan absensi: tabel yang sedikit menggemuk jauh lebih ringan
 * akibatnya daripada anggota yang gagal absen.
 */
export async function bersihkanNonceLama(): Promise<void> {
  const batas = new Date(Date.now() - MENIT_SIMPAN_NONCE * 60_000);
  try {
    await prisma.qrNonce.deleteMany({ where: { createdAt: { lt: batas } } });
  } catch (galat) {
    console.error("[nonce] gagal membersihkan jejak lama:", galat);
  }
}
