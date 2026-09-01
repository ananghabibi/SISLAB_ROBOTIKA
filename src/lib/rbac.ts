// -----------------------------------------------------------------------------
// Matriks hak akses (SPEC bagian 4.2).
//
// Ditulis sebagai data, bukan sebagai rangkaian `if` yang tersebar di halaman.
// Alasannya sederhana: matriks ini adalah kebijakan laboratorium, dan kebijakan
// harus bisa dibaca serta diuji dalam satu tempat. Setiap penjagaan rute dan
// setiap tombol di antarmuka membaca tabel yang sama persis.
// -----------------------------------------------------------------------------

import type { Role } from "@prisma/client";

/** Seberapa luas sebuah peran boleh melihat atau mengubah data sebuah modul. */
export type Lingkup = "TIDAK" | "SENDIRI" | "SEMUA";

export interface Izin {
  /** "SENDIRI" berarti miliknya sendiri, atau squadnya, tergantung modul. */
  baca: Lingkup;
  tulis: Lingkup;
  hapus: boolean;
}

export const MODUL = [
  "absensi_sendiri",
  "rekap_absensi",
  "absensi_manual",
  "master_anggota",
  "peran_hak_akses",
  "inventaris",
  "peminjaman",
  "piket",
  "logbook",
  "insiden",
  "periode_target",
  "skk",
  "audit_log",
  "ekspor",
] as const;

export type Modul = (typeof MODUL)[number];

export const LABEL_MODUL: Record<Modul, string> = {
  absensi_sendiri: "Absensi sendiri",
  rekap_absensi: "Rekap absensi",
  absensi_manual: "Absensi manual darurat",
  master_anggota: "Master anggota",
  peran_hak_akses: "Peran & hak akses",
  inventaris: "Inventaris",
  peminjaman: "Peminjaman",
  piket: "Piket",
  logbook: "Logbook riset",
  insiden: "Laporan insiden",
  periode_target: "Periode & target skor",
  skk: "Surat Keterangan Kontribusi",
  audit_log: "Audit log",
  ekspor: "Ekspor data",
};

export const LABEL_PERAN: Record<Role, string> = {
  KEPALA_LAB: "Kepala Laboratorium",
  KOORD_OPERASIONAL: "Koordinator Operasional",
  KOORD_RISET: "Koordinator Riset",
  KOORD_PENGEMBANGAN: "Koordinator Pengembangan",
  KETUA_SQUAD: "Ketua Squad",
  ANGGOTA: "Anggota",
  PENGAWAS: "Pengawas",
};

// Pintasan penulisan supaya tabel di bawah tetap terbaca sebagai tabel.
const tidak: Izin = { baca: "TIDAK", tulis: "TIDAK", hapus: false };
const bacaSemua: Izin = { baca: "SEMUA", tulis: "TIDAK", hapus: false };
const bacaSendiri: Izin = { baca: "SENDIRI", tulis: "TIDAK", hapus: false };
const tulisSemua: Izin = { baca: "SEMUA", tulis: "SEMUA", hapus: false };
const tulisSendiri: Izin = { baca: "SENDIRI", tulis: "SENDIRI", hapus: false };
const tulisHapus: Izin = { baca: "SEMUA", tulis: "SEMUA", hapus: true };

/**
 * Terjemahan langsung tabel SPEC 4.2.
 *
 * Legenda SPEC: B = baca semua, Bs = baca miliknya/squadnya, T = tulis,
 * H = hapus, — = tidak ada akses. Hak tulis selalu mencakup hak baca pada
 * lingkup yang sama; peran yang boleh mengubah data tentu boleh melihatnya.
 */
export const MATRIKS_AKSES: Record<Modul, Record<Role, Izin>> = {
  // | Modul | KEPALA_LAB | KOORD_OPS | KOORD_RISET | KOORD_PENG | KETUA_SQUAD | ANGGOTA | PENGAWAS |
  absensi_sendiri: {
    KEPALA_LAB: tulisSendiri,
    KOORD_OPERASIONAL: tulisSendiri,
    KOORD_RISET: tulisSendiri,
    KOORD_PENGEMBANGAN: tulisSendiri,
    KETUA_SQUAD: tulisSendiri,
    ANGGOTA: tulisSendiri,
    PENGAWAS: tidak,
  },
  rekap_absensi: {
    KEPALA_LAB: bacaSemua,
    KOORD_OPERASIONAL: tulisSemua,
    KOORD_RISET: bacaSemua,
    KOORD_PENGEMBANGAN: bacaSemua,
    KETUA_SQUAD: bacaSendiri,
    ANGGOTA: bacaSendiri,
    PENGAWAS: bacaSemua,
  },
  absensi_manual: {
    KEPALA_LAB: tulisSemua,
    KOORD_OPERASIONAL: tulisSemua,
    KOORD_RISET: tidak,
    KOORD_PENGEMBANGAN: tidak,
    KETUA_SQUAD: tidak,
    ANGGOTA: tidak,
    PENGAWAS: tidak,
  },
  master_anggota: {
    // MENYIMPANG DARI SPEC 4.2, yang memberi Koordinator Pengembangan "B"
    // (baca saja). Diubah atas permintaan Kepala Laboratorium: pendaftaran
    // anggota baru datang bersamaan dengan pembinaan kaderisasi, dan yang
    // menjalankannya adalah Koordinator Pengembangan. Menahan haknya hanya
    // melahirkan pendaftaran titipan lewat akun orang lain.
    //
    // Batasnya tetap: memberi peran selain ANGGOTA adalah modul
    // `peran_hak_akses`, dan modul itu masih milik Kepala Laboratorium
    // seorang. Hapus juga tetap tertutup.
    KEPALA_LAB: tulisHapus,
    KOORD_OPERASIONAL: tulisSemua,
    KOORD_RISET: bacaSemua,
    KOORD_PENGEMBANGAN: tulisSemua,
    KETUA_SQUAD: bacaSendiri,
    ANGGOTA: bacaSendiri,
    PENGAWAS: bacaSemua,
  },
  peran_hak_akses: {
    KEPALA_LAB: tulisSemua,
    KOORD_OPERASIONAL: tidak,
    KOORD_RISET: tidak,
    KOORD_PENGEMBANGAN: tidak,
    KETUA_SQUAD: tidak,
    ANGGOTA: tidak,
    PENGAWAS: tidak,
  },
  inventaris: {
    KEPALA_LAB: tulisHapus,
    KOORD_OPERASIONAL: tulisSemua,
    KOORD_RISET: bacaSemua,
    KOORD_PENGEMBANGAN: bacaSemua,
    KETUA_SQUAD: bacaSemua,
    ANGGOTA: bacaSemua,
    PENGAWAS: bacaSemua,
  },
  peminjaman: {
    // MENYIMPANG DARI SPEC 4.2, yang memberi Kepala Lab "B" (baca saja) di sini.
    // Diubah atas permintaan Kepala Laboratorium: di laboratorium ini dialah
    // yang paling sering berada di ruangan saat alat diminta, dan menolak
    // mencatatkannya hanya akan melahirkan pencatatan susulan oleh orang lain
    // atas nama orang lain — persis jenis catatan yang tidak bisa dipercaya.
    // Hapus tetap tertutup: catatan peminjaman tidak dihapus siapa pun.
    KEPALA_LAB: tulisSemua,
    KOORD_OPERASIONAL: tulisSemua,
    KOORD_RISET: bacaSemua,
    KOORD_PENGEMBANGAN: bacaSemua,
    KETUA_SQUAD: tulisSemua,
    ANGGOTA: bacaSendiri,
    PENGAWAS: bacaSemua,
  },
  piket: {
    // MENYIMPANG DARI SPEC 4.2, yang memberi Kepala Lab "B" (baca saja).
    // Diubah atas permintaan Kepala Laboratorium, dengan alasan yang sama
    // seperti pada peminjaman: dialah yang paling sering berada di ruangan
    // pada jam-jam terakhir. Piket yang tidak dapat dicatat orang yang sedang
    // berdiri di sana akan dicatat besok pagi oleh orang lain berdasarkan
    // ingatan — dan catatan piket yang diisi dari ingatan sama saja dengan
    // tidak ada catatan.
    KEPALA_LAB: tulisSemua,
    KOORD_OPERASIONAL: tulisSemua,
    KOORD_RISET: bacaSemua,
    KOORD_PENGEMBANGAN: bacaSemua,
    KETUA_SQUAD: tulisSendiri,
    ANGGOTA: bacaSendiri,
    PENGAWAS: bacaSemua,
  },
  logbook: {
    // MENYIMPANG DARI SPEC 4.2, yang memberi Kepala Lab "B" (baca saja).
    // Diubah atas permintaan Kepala Laboratorium. Perlu dicatat bahwa ini
    // menyimpang lebih jauh daripada dua penyimpangan lain: logbook adalah
    // catatan SQUAD tentang pekerjaannya sendiri, dan yang menulisnya
    // sebaiknya tetap squad itu. Hak ini dipakai untuk membantu squad yang
    // ketuanya berhalangan, bukan untuk menuliskan pekerjaan orang lain.
    // Setiap entri selalu menyimpan siapa penulisnya di `dibuatOlehId` dan
    // tercatat di audit log, jadi penggunaannya tidak pernah tersamar.
    KEPALA_LAB: tulisSemua,
    KOORD_OPERASIONAL: bacaSemua,
    KOORD_RISET: tulisSemua,
    KOORD_PENGEMBANGAN: bacaSemua,
    KETUA_SQUAD: tulisSendiri,
    ANGGOTA: tulisSendiri,
    PENGAWAS: bacaSemua,
  },
  insiden: {
    // Siapa pun boleh melapor; hanya Kepala Lab dan Koordinator yang membaca semuanya.
    KEPALA_LAB: tulisSemua,
    KOORD_OPERASIONAL: tulisSemua,
    KOORD_RISET: bacaSemua,
    KOORD_PENGEMBANGAN: bacaSemua,
    // Anggota dan ketua squad boleh MELAPOR, dan laporan itu miliknya sendiri.
    // Menyunting laporan orang lain bukan haknya, jadi lingkupnya SENDIRI.
    KETUA_SQUAD: tulisSendiri,
    ANGGOTA: tulisSendiri,
    PENGAWAS: bacaSemua,
  },
  periode_target: {
    KEPALA_LAB: tulisSemua,
    KOORD_OPERASIONAL: tidak,
    KOORD_RISET: tidak,
    KOORD_PENGEMBANGAN: tidak,
    KETUA_SQUAD: tidak,
    ANGGOTA: tidak,
    PENGAWAS: tidak,
  },
  skk: {
    // Hanya Kepala Lab yang menerbitkan. Surat itu pernyataan pribadi dosen
    // kepada Program Studi, bukan sekadar keluaran sistem.
    KEPALA_LAB: tulisSemua,
    KOORD_OPERASIONAL: bacaSemua,
    KOORD_RISET: bacaSemua,
    KOORD_PENGEMBANGAN: bacaSemua,
    KETUA_SQUAD: tidak,
    ANGGOTA: bacaSendiri,
    PENGAWAS: bacaSemua,
  },
  audit_log: {
    KEPALA_LAB: bacaSemua,
    KOORD_OPERASIONAL: bacaSendiri,
    KOORD_RISET: tidak,
    KOORD_PENGEMBANGAN: tidak,
    KETUA_SQUAD: tidak,
    ANGGOTA: tidak,
    PENGAWAS: tidak,
  },
  ekspor: {
    KEPALA_LAB: tulisSemua,
    KOORD_OPERASIONAL: tulisSemua,
    KOORD_RISET: bacaSemua,
    KOORD_PENGEMBANGAN: bacaSemua,
    KETUA_SQUAD: tidak,
    ANGGOTA: tidak,
    PENGAWAS: bacaSemua,
  },
};

export function izinUntuk(peran: Role, modul: Modul): Izin {
  return MATRIKS_AKSES[modul][peran];
}

export function bolehBaca(peran: Role, modul: Modul): boolean {
  return izinUntuk(peran, modul).baca !== "TIDAK";
}

export function bolehTulis(peran: Role, modul: Modul): boolean {
  return izinUntuk(peran, modul).tulis !== "TIDAK";
}

export function bolehHapus(peran: Role, modul: Modul): boolean {
  return izinUntuk(peran, modul).hapus;
}

export function bolehBacaSemua(peran: Role, modul: Modul): boolean {
  return izinUntuk(peran, modul).baca === "SEMUA";
}

/**
 * PENGAWAS tidak pernah punya akses tulis sama sekali (SPEC 4.2).
 * Diperiksa terpisah agar penambahan modul baru tidak diam-diam melanggarnya.
 */
export function peranHanyaBaca(peran: Role): boolean {
  return peran === "PENGAWAS";
}

/** Hanya Kepala Lab yang boleh menerbitkan Surat Keterangan Kontribusi. */
export function bolehMenerbitkanSkk(peran: Role): boolean {
  return peran === "KEPALA_LAB";
}
