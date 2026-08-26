// -----------------------------------------------------------------------------
// Pengumpul angka kontribusi.
//
// Menjembatani basis data dengan mesin skor di `src/lib/skor.ts`. Semua kueri
// dikumpulkan sekali untuk seluruh anggota, bukan satu kueri per orang: rekap
// 39 anggota dibuka berkali-kali sehari, dan pola N+1 akan terasa sejak bulan
// pertama.
//
// Beberapa komponen bersandar pada modul yang baru dibangun pada milestone
// berikutnya. Kueri-nya sudah benar dan akan langsung berisi begitu modulnya
// ada; sampai saat itu nilainya nol, bukan dikarang.
// -----------------------------------------------------------------------------

import type { Period, Prisma, User } from "@prisma/client";

import { durasiJam } from "./absensi";
import { prisma } from "./prisma";
import { daftarKekurangan, hitungSkor, type KomponenKontribusi, type RincianSkor } from "./skor";

/**
 * Jenis kegiatan absensi yang dihitung sebagai "sesi berbagi".
 *
 * SPEC menyebut komponen ini tetapi tidak memberinya tabel tersendiri. Yang
 * dipakai adalah sinyal yang memang sudah ada: sesi absensi yang ditandai
 * PELATIHAN, yaitu ketika seseorang membagikan ilmunya kepada anggota lain.
 * Bila kelak ada modul sesi berbagi yang berdiri sendiri, cukup ganti sumber
 * angkanya di sini.
 */
const KEGIATAN_SESI_BERBAGI = ["PELATIHAN"] as const;

export interface RekapAnggota {
  user: Pick<User, "id" | "nama" | "npm" | "role" | "squadId" | "fakultas" | "status"> & {
    squad: { nama: string; kode: string } | null;
  };
  komponen: KomponenKontribusi;
  totalJam: number;
  rincian: RincianSkor;
  kekurangan: ReturnType<typeof daftarKekurangan>;
}

function targetDari(periode: Period) {
  return {
    targetHadir: periode.targetHadir,
    targetSesiBerbagi: periode.targetSesiBerbagi,
    targetPiket: periode.targetPiket,
    targetLogbook: periode.targetLogbook,
    ambangLulus: periode.ambangLulus,
  };
}

/** Periode yang sedang berjalan, atau null bila belum ada yang ditandai aktif. */
export async function periodeAktif(): Promise<Period | null> {
  return prisma.period.findFirst({ where: { aktif: true }, orderBy: { tanggalMulai: "desc" } });
}

/**
 * Menghitung rekap kontribusi untuk sekumpulan anggota.
 *
 * @param saringanAnggota Pembatas lingkup dari `saringanRekap`. Wajib
 *   diteruskan pemanggil, supaya tidak ada halaman yang tanpa sengaja
 *   menampilkan angka seluruh laboratorium kepada orang yang tidak berhak.
 */
export async function rekapKontribusi(
  periode: Period,
  saringanAnggota: Prisma.UserWhereInput,
): Promise<RekapAnggota[]> {
  const anggota = await prisma.user.findMany({
    where: { ...saringanAnggota, status: { in: ["AKTIF", "CUTI"] } },
    orderBy: [{ nama: "asc" }],
    select: {
      id: true,
      nama: true,
      npm: true,
      role: true,
      squadId: true,
      fakultas: true,
      status: true,
      squad: { select: { nama: true, kode: true } },
    },
  });
  if (anggota.length === 0) return [];

  const idAnggota = anggota.map((a) => a.id);
  const idSquad = [...new Set(anggota.map((a) => a.squadId).filter((s): s is string => !!s))];
  const rentang = { gte: periode.tanggalMulai, lte: periode.tanggalSelesai };

  const [absensi, piket, logbook, pinjaman] = await Promise.all([
    prisma.attendance.findMany({
      where: { userId: { in: idAnggota }, tanggal: rentang, dibatalkan: false },
      select: { userId: true, jamMasuk: true, jamKeluar: true, jenisKegiatan: true },
    }),
    prisma.piketLog.groupBy({
      by: ["pengisiId"],
      where: { pengisiId: { in: idAnggota }, tanggal: rentang },
      _count: { _all: true },
    }),
    idSquad.length
      ? prisma.logbook.groupBy({
          by: ["squadId"],
          where: { squadId: { in: idSquad }, tanggal: rentang },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    prisma.loan.groupBy({
      by: ["peminjamId"],
      // Alat "belum kembali" adalah yang sudah lewat rencana kembalinya,
      // sudah ditandai terlambat, atau dinyatakan hilang. Pinjaman yang masih
      // dalam tenggat bukan pelanggaran dan tidak dipotong.
      where: {
        peminjamId: { in: idAnggota },
        OR: [
          { status: "DIPINJAM", rencanaKembali: { lt: new Date() } },
          { status: { in: ["TERLAMBAT", "HILANG"] } },
        ],
      },
      _count: { _all: true },
    }),
  ]);

  const hadirPer = new Map<string, number>();
  const jamPer = new Map<string, number>();
  const berbagiPer = new Map<string, number>();
  for (const a of absensi) {
    hadirPer.set(a.userId, (hadirPer.get(a.userId) ?? 0) + 1);
    jamPer.set(a.userId, (jamPer.get(a.userId) ?? 0) + durasiJam(a));
    if ((KEGIATAN_SESI_BERBAGI as readonly string[]).includes(a.jenisKegiatan)) {
      berbagiPer.set(a.userId, (berbagiPer.get(a.userId) ?? 0) + 1);
    }
  }

  const piketPer = new Map(piket.map((p) => [p.pengisiId, p._count._all]));
  const logbookPerSquad = new Map(logbook.map((l) => [l.squadId, l._count._all]));
  const alatPer = new Map(pinjaman.map((p) => [p.peminjamId, p._count._all]));

  const target = targetDari(periode);

  return anggota.map((a) => {
    const komponen: KomponenKontribusi = {
      hariHadir: hadirPer.get(a.id) ?? 0,
      sesiBerbagi: berbagiPer.get(a.id) ?? 0,
      piket: piketPer.get(a.id) ?? 0,
      // Logbook adalah kegiatan squad, jadi angkanya sama untuk seluruh
      // anggota squad itu. Anggota tanpa squad tidak punya logbook.
      entriLogbook: a.squadId ? (logbookPerSquad.get(a.squadId) ?? 0) : 0,
      alatBelumKembali: alatPer.get(a.id) ?? 0,
    };

    return {
      user: a,
      komponen,
      totalJam: Math.round((jamPer.get(a.id) ?? 0) * 100) / 100,
      rincian: hitungSkor(komponen, target),
      kekurangan: daftarKekurangan(komponen, target),
    };
  });
}

/**
 * Menyimpan hasil hitungan sebagai ContributionSnapshot.
 *
 * Snapshot ini adalah bahan Surat Keterangan Kontribusi pada Milestone 6.
 * Perhitungan ulang menimpa baris yang sama — yang dibekukan permanen bukan
 * snapshot ini, melainkan `snapshotJson` di dalam surat yang sudah terbit.
 */
export async function simpanSnapshotKontribusi(periode: Period): Promise<number> {
  const rekap = await rekapKontribusi(periode, {});
  const dihitungPada = new Date();

  for (const r of rekap) {
    const data = {
      hariHadir: r.komponen.hariHadir,
      persenHadir: r.rincian.persenHadir,
      totalJam: r.totalJam,
      sesiBerbagi: r.komponen.sesiBerbagi,
      piket: r.komponen.piket,
      entriLogbook: r.komponen.entriLogbook,
      alatBelumKembali: r.komponen.alatBelumKembali,
      skor: r.rincian.skor,
      status: r.rincian.lulus ? ("LULUS" as const) : ("BELUM_LULUS" as const),
      dihitungPada,
    };
    await prisma.contributionSnapshot.upsert({
      where: { periodId_userId: { periodId: periode.id, userId: r.user.id } },
      update: data,
      create: { periodId: periode.id, userId: r.user.id, ...data },
    });
  }

  return rekap.length;
}
