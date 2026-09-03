// -----------------------------------------------------------------------------
// Logbook riset mingguan.
//
// Penomoran pekan adalah inti modul ini, dan satu-satunya bagian yang mudah
// salah. Pekan dihitung mulai SENIN, bukan mulai hari periode kebetulan
// dibuka: kalau periode dibuka hari Rabu, "pekan ini" akan berarti Rabu–Selasa
// bagi sistem sementara semua orang membacanya Senin–Minggu, dan penanda
// "belum mengisi pekan ini" jadi menuduh squad yang sebenarnya sudah mengisi.
// -----------------------------------------------------------------------------

import { awalPekanWib } from "./waktu";

const SEPEKAN = 7 * 86_400_000;

export interface Pekan {
  mingguKe: number;
  mulai: Date;
  selesai: Date;
}

/**
 * Nomor pekan sebuah tanggal terhadap awal periode. Pekan pertama bernomor 1.
 *
 * Tanggal sebelum periode dimulai mengembalikan angka lebih kecil dari 1, dan
 * pemanggilnya wajib menolaknya — logbook untuk pekan yang belum ada tidak
 * boleh tersimpan hanya karena tanggalnya salah ketik.
 */
export function mingguKeDari(tanggal: Date, mulaiPeriode: Date): number {
  const pekanTanggal = awalPekanWib(tanggal).getTime();
  const pekanMulai = awalPekanWib(mulaiPeriode).getTime();
  return Math.floor((pekanTanggal - pekanMulai) / SEPEKAN) + 1;
}

/** Rentang tanggal sebuah nomor pekan, untuk ditampilkan apa adanya. */
export function rentangPekan(mingguKe: number, mulaiPeriode: Date): Pekan {
  const mulai = new Date(awalPekanWib(mulaiPeriode).getTime() + (mingguKe - 1) * SEPEKAN);
  return { mingguKe, mulai, selesai: new Date(mulai.getTime() + 6 * 86_400_000) };
}

/** Pekan yang sedang berjalan pada sebuah periode. */
export function pekanBerjalan(mulaiPeriode: Date, sekarang: Date = new Date()): Pekan {
  return rentangPekan(mingguKeDari(sekarang, mulaiPeriode), mulaiPeriode);
}

/**
 * Banyaknya pekan yang sudah berjalan pada periode, dibatasi panjang periode.
 *
 * Dipakai menghitung "entri logbook ≥ 70 persen pekan aktif" (SPEC 6.2). Yang
 * dihitung adalah pekan yang SUDAH lewat atau sedang berjalan; pekan yang
 * belum tiba tidak boleh ikut menjadi penyebut, karena squad tidak dapat
 * mengisi logbook untuk pekan yang belum terjadi.
 */
export function pekanAktif(mulaiPeriode: Date, selesaiPeriode: Date, sekarang: Date = new Date()): number {
  const berjalan = mingguKeDari(sekarang, mulaiPeriode);
  const seluruh = mingguKeDari(selesaiPeriode, mulaiPeriode);
  return Math.max(0, Math.min(berjalan, seluruh));
}

/** Satu nama yang ikut bekerja pada pekan itu, sebagaimana disimpan di Json. */
export interface AnggotaTerlibat {
  id: string;
  nama: string;
}

/**
 * Membaca medan `anggotaTerlibat` dari basis data.
 *
 * Nama ikut disimpan, tidak hanya id. Logbook adalah catatan sejarah squad:
 * ketika anggota lulus dan barisnya hilang dari daftar anggota aktif, catatan
 * pekan yang sudah lewat tetap harus terbaca sebagaimana ia ditulis dulu.
 *
 * Bentuk apa pun yang tidak dikenali diabaikan diam-diam. Logbook lama tidak
 * boleh membuat halamannya gagal dibuka.
 */
export function bacaAnggotaTerlibat(nilai: unknown): AnggotaTerlibat[] {
  if (!Array.isArray(nilai)) return [];
  return nilai.flatMap((butir) => {
    if (typeof butir !== "object" || butir === null) return [];
    const { id, nama } = butir as Record<string, unknown>;
    if (typeof id !== "string" || typeof nama !== "string") return [];
    if (id.length === 0 || nama.length === 0) return [];
    return [{ id, nama }];
  });
}

export type AlasanTolakPekan =
  | { boleh: true }
  | { boleh: false; alasan: string };

/**
 * Apakah sebuah nomor pekan boleh diisi sekarang.
 *
 * Tiga penolakan, dan ketiganya pernah bisa lolos:
 *
 * 1. Pekan sebelum periode dibuka — bernomor 0 atau kurang. Muncul ketika
 *    sistem dicoba sebelum semester berjalan, dan halamannya dengan lugu
 *    menawarkan "Isi logbook pekan 0".
 * 2. Pekan yang belum tiba. Logbook yang boleh diisi ke depan akan diisi
 *    sebulan sekaligus pada malam sebelum penilaian.
 * 3. Pekan setelah periode berakhir. Nomor pekan terus bertambah selamanya
 *    setelah tanggal selesai lewat, jadi tanpa batas ini periode yang sudah
 *    ditutup masih menerima entri baru.
 */
export function pekanDapatDiisi(
  mingguKe: number,
  mulaiPeriode: Date,
  selesaiPeriode: Date,
  sekarang: Date = new Date(),
): AlasanTolakPekan {
  if (mingguKe < 1) {
    return {
      boleh: false,
      alasan: "Pekan itu berada sebelum periode dimulai, jadi belum ada yang bisa dicatat.",
    };
  }

  const pekanTerakhir = mingguKeDari(selesaiPeriode, mulaiPeriode);
  if (mingguKe > pekanTerakhir) {
    return {
      boleh: false,
      alasan: `Periode ini hanya berjalan sampai pekan ${pekanTerakhir}.`,
    };
  }

  if (mingguKe > mingguKeDari(sekarang, mulaiPeriode)) {
    return {
      boleh: false,
      alasan:
        "Pekan itu belum tiba. Logbook hanya dapat diisi untuk pekan yang sedang atau sudah berjalan.",
    };
  }

  return { boleh: true };
}
