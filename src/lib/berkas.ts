// -----------------------------------------------------------------------------
// Penyimpanan berkas unggahan.
//
// Foto kondisi alat saat dipinjam dan saat dikembalikan adalah bukti; kalau ada
// yang lecet, foto inilah yang menentukan sejak kapan. Karena itu berkasnya
// disimpan di volume tersendiri (`uploads/`) yang tidak ikut terhapus saat
// aplikasi dibangun ulang, dan tidak pernah disajikan langsung dari folder
// publik.
//
// Setiap unggahan divalidasi jenis dan ukurannya (SPEC bagian 8). Yang
// diperiksa adalah ISI berkasnya — beberapa bita pertama yang menandai
// jenisnya — bukan nama berkas maupun tipe yang dikirim peramban, karena
// keduanya ditentukan pengirim dan bisa dikarang.
// -----------------------------------------------------------------------------

import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { UKURAN_MAKSIMAL, UKURAN_MAKSIMAL_MB } from "./unggahan";

export { UKURAN_MAKSIMAL, UKURAN_MAKSIMAL_MB };

/** Jenis yang diterima, beserta tanda pengenal di awal berkasnya. */
const JENIS_DITERIMA = [
  { mime: "image/jpeg", ekstensi: "jpg", tanda: [0xff, 0xd8, 0xff] },
  { mime: "image/png", ekstensi: "png", tanda: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/webp", ekstensi: "webp", tanda: [0x52, 0x49, 0x46, 0x46] },
] as const;

export type HasilUnggah =
  | { ok: true; jalur: string }
  | { ok: false; pesan: string };

function akarUnggahan(): string {
  return process.env.FOLDER_UNGGAHAN ?? path.join(process.cwd(), "uploads");
}

function cocokTanda(bita: Uint8Array, tanda: readonly number[]): boolean {
  return tanda.every((t, i) => bita[i] === t);
}

/**
 * Menyimpan satu berkas gambar.
 *
 * @param kelompok Subfolder, mis. "peminjaman". Hanya huruf, angka, dan
 *   tanda hubung — supaya nilai dari luar tidak bisa menjelajah ke folder lain.
 */
export async function simpanGambar(berkas: File, kelompok: string): Promise<HasilUnggah> {
  if (!/^[a-z0-9-]+$/.test(kelompok)) {
    return { ok: false, pesan: "Kelompok berkas tidak sah." };
  }
  if (berkas.size === 0) {
    return { ok: false, pesan: "Berkas foto kosong." };
  }
  if (berkas.size > UKURAN_MAKSIMAL) {
    const mb = (berkas.size / 1024 / 1024).toFixed(1);
    return {
      ok: false,
      pesan: `Ukuran foto ${mb} MB melampaui batas ${UKURAN_MAKSIMAL_MB} MB. Kecilkan dulu fotonya.`,
    };
  }

  const isi = new Uint8Array(await berkas.arrayBuffer());
  const jenis = JENIS_DITERIMA.find((j) => cocokTanda(isi, j.tanda));
  if (!jenis) {
    return {
      ok: false,
      pesan: "Berkas ini bukan gambar JPG, PNG, atau WEBP. Ambil ulang fotonya.",
    };
  }

  // Nama berkas dibuat sendiri, tidak pernah memakai nama dari pengunggah.
  const nama = `${Date.now()}-${randomBytes(6).toString("hex")}.${jenis.ekstensi}`;
  const folder = path.join(akarUnggahan(), kelompok);
  await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, nama), isi);

  return { ok: true, jalur: `${kelompok}/${nama}` };
}

/**
 * Mengubah jalur tersimpan menjadi lokasi berkas yang sebenarnya.
 * Mengembalikan null bila jalurnya mencurigakan.
 */
export function lokasiBerkas(jalur: string): string | null {
  if (!/^[a-z0-9-]+\/[A-Za-z0-9._-]+$/.test(jalur)) return null;
  if (jalur.includes("..")) return null;

  const penuh = path.resolve(akarUnggahan(), jalur);
  // Penjagaan terakhir: hasil akhirnya wajib berada di dalam folder unggahan.
  if (!penuh.startsWith(path.resolve(akarUnggahan()) + path.sep)) return null;
  return penuh;
}

/**
 * Menghapus satu berkas unggahan.
 *
 * Dipakai membuang foto kartu identitas begitu alatnya kembali. Kegagalan
 * penghapusan tidak dilempar: pengembalian alat tidak boleh gagal hanya karena
 * berkasnya sudah lebih dulu hilang dari cakram. Kembaliannya menyatakan apakah
 * berkas itu benar-benar ada dan terhapus.
 */
export async function hapusBerkas(jalur: string): Promise<boolean> {
  const lokasi = lokasiBerkas(jalur);
  if (!lokasi) return false;
  try {
    await unlink(lokasi);
    return true;
  } catch {
    return false;
  }
}

export function tipeDariJalur(jalur: string): string {
  const ekstensi = jalur.split(".").pop()?.toLowerCase();
  const jenis = JENIS_DITERIMA.find((j) => j.ekstensi === ekstensi);
  return jenis?.mime ?? "application/octet-stream";
}
