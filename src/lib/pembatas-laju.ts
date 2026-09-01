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

// -----------------------------------------------------------------------------
// Kebijakan pembatasan percobaan masuk.
//
// Sampai sekarang halaman masuk menerima percobaan kata sandi tanpa batas.
// Itu lubang terbesar di seluruh sistem, dan justru pada pintu yang paling
// berharga: akun dosen. Menebak kata sandi Kepala Laboratorium berarti
// memperoleh hak menerbitkan Surat Keterangan Kontribusi, mengubah peran siapa
// pun, dan mengatur target periode — seluruh anti titip absen menjadi tidak
// ada artinya bila pintu itu dapat digedor semalaman.
//
// Dibatasi dua arah sekaligus, karena keduanya menutup hal yang berbeda:
// per AKUN menghentikan penebakan pada satu surel dari banyak tempat, dan
// per ALAMAT menghentikan satu tempat yang mencoba banyak surel.
// -----------------------------------------------------------------------------

/** Percobaan per akun dalam satu jendela. */
export const BATAS_MASUK_AKUN = 5;

/** Percobaan per alamat IP dalam satu jendela. */
export const BATAS_MASUK_IP = 20;

/** Panjang jendela pembatasan masuk, dalam detik. */
export const JENDELA_MASUK_DETIK = 10 * 60;

/**
 * Memeriksa apakah sebuah percobaan masuk masih boleh dilanjutkan.
 *
 * Mengembalikan null bila boleh, atau kalimat penolakan yang sudah siap
 * ditampilkan. Kalimatnya menyebut lama menunggu, tetapi TIDAK menyebut apakah
 * surelnya terdaftar — sama seperti pesan "surel atau kata sandi salah", supaya
 * halaman masuk tidak berubah menjadi alat memeriksa keanggotaan seseorang.
 */
export function periksaLajuMasuk(ip: string | null, email: string): string | null {
  const akun = periksaLaju(
    `masuk:akun:${email.trim().toLowerCase()}`,
    BATAS_MASUK_AKUN,
    JENDELA_MASUK_DETIK,
  );
  if (!akun.diizinkan) {
    return (
      "Terlalu banyak percobaan masuk untuk akun ini. " +
      `Tunggu ${Math.ceil(akun.cobaLagiDetik / 60)} menit lagi, atau minta Koordinator ` +
      "Operasional memasang ulang kata sandinya."
    );
  }

  // Alamat yang tidak terbaca tetap dihitung, memakai satu ember bersama.
  // Membiarkannya lolos berarti menyediakan jalan pintas bagi siapa pun yang
  // dapat menghapus header alamat.
  const alamat = periksaLaju(`masuk:ip:${ip ?? "tak-terbaca"}`, BATAS_MASUK_IP, JENDELA_MASUK_DETIK);
  if (!alamat.diizinkan) {
    return (
      "Terlalu banyak percobaan masuk dari perangkat ini. " +
      `Tunggu ${Math.ceil(alamat.cobaLagiDetik / 60)} menit lagi.`
    );
  }

  return null;
}

/** Percobaan mengganti kata sandi dalam satu jendela, per akun. */
export const BATAS_GANTI_SANDI = 5;

/**
 * Membatasi percobaan mengganti kata sandi.
 *
 * Formulirnya menuntut kata sandi LAMA, jadi tanpa batas ini ia menjadi tempat
 * menebak kata sandi seseorang yang lupa keluar dari sesinya di komputer
 * bersama laboratorium — tanpa perlu menyentuh halaman masuk sama sekali.
 */
export function periksaLajuGantiSandi(userId: string): string | null {
  const hasil = periksaLaju(`sandi:${userId}`, BATAS_GANTI_SANDI, JENDELA_MASUK_DETIK);
  if (hasil.diizinkan) return null;
  return (
    "Terlalu banyak percobaan mengganti kata sandi. " +
    `Tunggu ${Math.ceil(hasil.cobaLagiDetik / 60)} menit lagi.`
  );
}
