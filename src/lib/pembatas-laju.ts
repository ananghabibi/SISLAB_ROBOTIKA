// -----------------------------------------------------------------------------
// Pembatas laju sederhana (SPEC bagian 8).
//
// Disimpan di memori proses, bukan di basis data. Sistem ini berjalan sebagai
// satu kontainer aplikasi pada satu mini PC, jadi memori proses sudah mewakili
// seluruh sistem. Menaruhnya di basis data justru menambah satu tulisan pada
// setiap percobaan — termasuk percobaan yang sedang kita tolak.
//
// Konsekuensi yang diterima: hitungan ikut hilang saat aplikasi dimuat ulang.
// Itu memadai untuk yang ingin dicegah di sini — penebakan kode harian secara
// beruntun, bukan serangan terdistribusi.
// -----------------------------------------------------------------------------

interface Jejak {
  waktu: number[];
}

const jejakPerKunci = new Map<string, Jejak>();

export interface HasilPembatas {
  diizinkan: boolean;
  sisa: number;
  cobaLagiDetik: number;
}

/**
 * @param kunci     Pengenal pemohon, mis. `absensi:ip:192.168.1.7`.
 * @param batas     Berapa kali diizinkan dalam satu jendela.
 * @param jendelaDetik Panjang jendela.
 */
export function periksaLaju(kunci: string, batas: number, jendelaDetik: number): HasilPembatas {
  const sekarang = Date.now();
  const awal = sekarang - jendelaDetik * 1000;

  const jejak = jejakPerKunci.get(kunci) ?? { waktu: [] };
  const terkini = jejak.waktu.filter((w) => w > awal);

  if (terkini.length >= batas) {
    const tertua = terkini[0]!;
    return {
      diizinkan: false,
      sisa: 0,
      cobaLagiDetik: Math.max(1, Math.ceil((tertua + jendelaDetik * 1000 - sekarang) / 1000)),
    };
  }

  terkini.push(sekarang);
  jejakPerKunci.set(kunci, { waktu: terkini });

  // Menjaga peta tidak tumbuh tanpa batas pada proses yang hidup berbulan-bulan.
  if (jejakPerKunci.size > 5000) {
    for (const [k, v] of jejakPerKunci) {
      if (v.waktu.every((w) => w <= awal)) jejakPerKunci.delete(k);
    }
  }

  return { diizinkan: true, sisa: batas - terkini.length, cobaLagiDetik: 0 };
}

/** Hanya untuk pengujian: mengosongkan seluruh jejak. */
export function kosongkanPembatas(): void {
  jejakPerKunci.clear();
}
