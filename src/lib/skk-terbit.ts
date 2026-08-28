// -----------------------------------------------------------------------------
// Penerbitan Surat Keterangan Kontribusi.
//
// Aturan yang tidak boleh dilanggar berkas ini: surat yang sudah terbit
// dirender SEPENUHNYA dari `snapshotJson`, tidak pernah dari perhitungan ulang.
// Koreksi absensi sesudahnya — pembatalan catatan, penambahan sesi manual,
// perubahan target periode — tidak boleh menggeser satu angka pun pada surat
// yang sudah keluar. Surat itu dokumen resmi yang mungkin sudah dicetak,
// ditandatangani, dan dikirim ke Program Studi.
//
// Karena itu snapshot menyimpan segalanya yang dibutuhkan lembar suratnya,
// termasuk nama dan NPM pemiliknya — bukan sekadar id yang nanti dibaca ulang.
// -----------------------------------------------------------------------------

import { Prisma, type Period } from "@prisma/client";

import { pekanAktif } from "./logbook";
import { rekapKontribusi, type RekapAnggota } from "./kontribusi";
import { prisma } from "./prisma";
import { nomorSkk, syaratSkk, type SyaratSkk } from "./skk";
import { tanggalKalenderWib, ZONA_WIB } from "./waktu";

/** Isi `snapshotJson`. Bentuknya sengaja datar supaya mudah dibaca manusia. */
export interface IsiSnapshotSkk {
  versi: 1;
  nama: string;
  npm: string | null;
  prodi: string | null;
  fakultas: string;
  squad: string | null;
  namaPeriode: string;
  rentangPeriode: string;
  hariHadir: number;
  persenHadir: number;
  totalJam: number;
  sesiBerbagi: number;
  piket: number;
  entriLogbook: number;
  pekanAktif: number;
  alatBelumKembali: number;
  skor: number;
  ambangLulus: number;
  syarat: SyaratSkk[];
  dokumentasiTuntas: boolean | null;
  timLomba: boolean;
  /** Diisi bila Kepala Lab menerbitkan walau ada syarat yang belum terpenuhi. */
  diterbitkanMeskiKurang: string[];
  diterbitkanOleh: string;
}

export interface Kandidat {
  rekap: RekapAnggota;
  syarat: SyaratSkk[];
  layak: boolean;
  /** Surat yang sudah terbit untuk periode ini, bila ada. */
  sudahTerbit: { id: string; nomor: string; tanggalTerbit: Date } | null;
}

/**
 * Daftar kandidat beserta alasan kelayakan ATAU ketidaklayakannya.
 *
 * Mengembalikan seluruh anggota dalam lingkup, bukan hanya yang layak: yang
 * belum layak justru perlu melihat angka mana yang kurang selagi periodenya
 * masih berjalan.
 */
export async function daftarKandidat(
  periode: Period,
  saringanAnggota: Prisma.UserWhereInput,
): Promise<Kandidat[]> {
  const [rekap, terbit] = await Promise.all([
    rekapKontribusi(periode, saringanAnggota),
    prisma.skk.findMany({
      where: { periodId: periode.id },
      select: { id: true, nomor: true, tanggalTerbit: true, userId: true },
    }),
  ]);

  const perOrang = new Map(terbit.map((s) => [s.userId, s]));
  const pekan = pekanAktif(periode.tanggalMulai, periode.tanggalSelesai);

  return rekap.map((r) => {
    const syarat = syaratSkk({
      persenHadir: r.rincian.persenHadir,
      entriLogbook: r.komponen.entriLogbook,
      pekanAktif: pekan,
      piket: r.komponen.piket,
      targetPiket: periode.targetPiket,
      skor: r.rincian.skor,
      ambangLulus: periode.ambangLulus,
    });
    const sudah = perOrang.get(r.user.id);
    return {
      rekap: r,
      syarat,
      layak: syarat.every((s) => s.terpenuhi === true),
      sudahTerbit: sudah
        ? { id: sudah.id, nomor: sudah.nomor, tanggalTerbit: sudah.tanggalTerbit }
        : null,
    };
  });
}

export type HasilTerbit =
  | { ok: true; skk: { id: string; nomor: string } }
  | { ok: false; pesan: string };

/** Bulan dan tahun WIB dari sebuah instan, untuk nomor surat. */
function bulanTahunWib(waktu: Date): { bulan: number; tahun: number } {
  const bagian = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_WIB,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(waktu);
  const ambil = (jenis: string) => Number(bagian.find((b) => b.type === jenis)?.value ?? 0);
  return { bulan: ambil("month"), tahun: ambil("year") };
}

/**
 * Menerbitkan satu surat.
 *
 * Nomor dihitung dari banyaknya surat yang sudah terbit pada tahun berjalan,
 * lalu diuji lewat kekangan unik di basis data — bukan sekadar diandalkan.
 * Dua penerbitan pada detik yang sama akan menghasilkan nomor yang sama, dan
 * yang kalah mencoba lagi dengan nomor berikutnya. Menghitung tanpa penjagaan
 * ini berarti nomor surat resmi bergantung pada nasib.
 */
export async function terbitkanSkk(masukan: {
  periode: Period;
  userId: string;
  diterbitkanOlehId: string;
  dokumentasiTuntas: boolean | null;
  timLomba: boolean;
  /** Kepala Lab menyatakan tetap menerbitkan walau ada syarat yang kurang. */
  tetapTerbitkan: boolean;
}): Promise<HasilTerbit> {
  const { periode, userId } = masukan;

  const sudah = await prisma.skk.findUnique({
    where: { userId_periodId: { userId, periodId: periode.id } },
    select: { nomor: true },
  });
  if (sudah) {
    return { ok: false, pesan: `Surat untuk anggota ini sudah terbit dengan nomor ${sudah.nomor}.` };
  }

  const kandidat = (await daftarKandidat(periode, { id: userId }))[0];
  if (!kandidat) return { ok: false, pesan: "Anggota tidak ditemukan pada periode ini." };

  const syarat = syaratSkk({
    persenHadir: kandidat.rekap.rincian.persenHadir,
    entriLogbook: kandidat.rekap.komponen.entriLogbook,
    pekanAktif: pekanAktif(periode.tanggalMulai, periode.tanggalSelesai),
    piket: kandidat.rekap.komponen.piket,
    targetPiket: periode.targetPiket,
    skor: kandidat.rekap.rincian.skor,
    ambangLulus: periode.ambangLulus,
    timLomba: masukan.timLomba,
    dokumentasiTuntas: masukan.dokumentasiTuntas,
  });

  const kurang = syarat.filter((s) => s.terpenuhi !== true);
  if (kurang.length > 0 && !masukan.tetapTerbitkan) {
    return {
      ok: false,
      pesan:
        `Ada ${kurang.length} syarat yang belum terpenuhi: ` +
        `${kurang.map((s) => s.label).join(", ")}. ` +
        "Centang pernyataan di bawah bila Anda tetap menerbitkannya atas pertimbangan sendiri.",
    };
  }

  const penerbit = await prisma.user.findUnique({
    where: { id: masukan.diterbitkanOlehId },
    select: { nama: true },
  });

  const u = kandidat.rekap.user;
  const isi: IsiSnapshotSkk = {
    versi: 1,
    nama: u.nama,
    npm: u.npm,
    prodi: null,
    fakultas: u.fakultas,
    squad: u.squad?.nama ?? null,
    namaPeriode: periode.nama,
    rentangPeriode: `${periode.tanggalMulai.toISOString().slice(0, 10)} s.d. ${periode.tanggalSelesai.toISOString().slice(0, 10)}`,
    hariHadir: kandidat.rekap.komponen.hariHadir,
    persenHadir: kandidat.rekap.rincian.persenHadir,
    totalJam: kandidat.rekap.totalJam,
    sesiBerbagi: kandidat.rekap.komponen.sesiBerbagi,
    piket: kandidat.rekap.komponen.piket,
    entriLogbook: kandidat.rekap.komponen.entriLogbook,
    pekanAktif: pekanAktif(periode.tanggalMulai, periode.tanggalSelesai),
    alatBelumKembali: kandidat.rekap.komponen.alatBelumKembali,
    skor: kandidat.rekap.rincian.skor,
    ambangLulus: periode.ambangLulus,
    syarat,
    dokumentasiTuntas: masukan.dokumentasiTuntas,
    timLomba: masukan.timLomba,
    diterbitkanMeskiKurang: kurang.map((s) => s.label),
    diterbitkanOleh: penerbit?.nama ?? "—",
  };

  const { bulan, tahun } = bulanTahunWib(new Date());
  const awalTahun = new Date(Date.UTC(tahun, 0, 1));
  const akhirTahun = new Date(Date.UTC(tahun + 1, 0, 1));

  // Beberapa percobaan, bukan satu: nomor yang bentrok berarti ada penerbitan
  // lain yang menyelip, dan yang benar adalah mengambil nomor berikutnya.
  for (let percobaan = 0; percobaan < 10; percobaan++) {
    const terpakai = await prisma.skk.count({
      where: { tanggalTerbit: { gte: awalTahun, lt: akhirTahun } },
    });
    const nomor = nomorSkk(terpakai + 1 + percobaan, bulan, tahun);

    try {
      const skk = await prisma.skk.create({
        data: {
          userId,
          periodId: periode.id,
          nomor,
          tanggalTerbit: tanggalKalenderWib(),
          snapshotJson: isi as unknown as Prisma.InputJsonValue,
          diterbitkanOlehId: masukan.diterbitkanOlehId,
        },
        select: { id: true, nomor: true },
      });
      return { ok: true, skk };
    } catch (galat) {
      if (galat instanceof Prisma.PrismaClientKnownRequestError && galat.code === "P2002") {
        const bentrok = (galat.meta?.target as string[] | undefined) ?? [];
        // Bentrok pada (userId, periodId) berarti orang lain baru saja
        // menerbitkan surat yang sama — mengulang tidak akan menolong.
        if (bentrok.includes("userId") || bentrok.includes("periodId")) {
          return { ok: false, pesan: "Surat untuk anggota ini baru saja diterbitkan orang lain." };
        }
        continue; // Nomor bentrok; coba nomor berikutnya.
      }
      throw galat;
    }
  }

  return {
    ok: false,
    pesan: "Nomor surat selalu bentrok setelah 10 percobaan. Coba lagi beberapa saat.",
  };
}

/** Membaca `snapshotJson` menjadi bentuk yang dikenal lembar surat. */
export function bacaSnapshot(nilai: unknown): IsiSnapshotSkk | null {
  if (typeof nilai !== "object" || nilai === null) return null;
  const isi = nilai as Partial<IsiSnapshotSkk>;
  if (typeof isi.nama !== "string" || typeof isi.skor !== "number") return null;
  return isi as IsiSnapshotSkk;
}
