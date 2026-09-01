// -----------------------------------------------------------------------------
// Seeder SILAB.
//
// Membaca `data/squad-data.csv` dan `data/seed-data.csv`, lalu menyusun 6 squad,
// 39 anggota, dan 1 periode aktif.
//
// Bersifat idempoten: dijalankan berulang kali menghasilkan keadaan yang sama.
// Ini penting karena seeder juga dipakai pengurus tahun berikutnya untuk
// memuat daftar anggota periode baru, bukan hanya sekali saat pemasangan.
// -----------------------------------------------------------------------------

import { readFileSync } from "node:fs";
import path from "node:path";

import {
  PrismaClient,
  type Jenjang,
  type KondisiAset,
  type Role,
  type StatusAnggota,
} from "@prisma/client";
import bcrypt from "bcryptjs";

import { AWALAN_ASET_CONTOH } from "../src/lib/aset";
import { uraiCsv } from "../src/lib/csv";
import { sandiBawaan, sandiBawaanDiabaikan } from "../src/lib/sandi";
import {
  angkatanDariNpm,
  jenjangDariAngkatan,
  npmValid,
  prodiDariNpm,
  semesterBerjalan,
} from "../src/lib/npm";

const prisma = new PrismaClient();

/** Tahun ajaran berjalan; dipakai menghitung semester. */
const TAHUN_AJARAN = 2026;

const AKAR = path.resolve(__dirname, "..");

function bacaCsv(namaBerkas: string) {
  return uraiCsv(readFileSync(path.join(AKAR, "data", namaBerkas), "utf8"));
}

function angkaAtau(teks: string, cadangan: number | null): number | null {
  if (!teks) return cadangan;
  const n = Number(teks);
  return Number.isFinite(n) ? n : cadangan;
}

async function seedSquad() {
  const baris = bacaCsv("squad-data.csv");
  for (const s of baris) {
    await prisma.squad.upsert({
      where: { kode: s.kode! },
      update: { nama: s.nama!, deskripsi: s.deskripsi || null },
      create: { kode: s.kode!, nama: s.nama!, deskripsi: s.deskripsi || null },
    });
  }
  console.log(`  squad     : ${baris.length}`);
  return baris;
}

async function seedAnggota() {
  const baris = bacaCsv("seed-data.csv");
  const squadPerKode = new Map(
    (await prisma.squad.findMany({ select: { id: true, kode: true } })).map((s) => [s.kode, s.id]),
  );

  // Setiap akun lahir dengan kata sandi, termasuk anggota mahasiswa yang
  // sehari-hari masuk lewat Google: kalau Google sedang tidak dapat dihubungi
  // dari dalam laboratorium, absensi tidak boleh ikut berhenti.
  //
  // Akun dosen boleh memakai kata sandi tersendiri lewat SEED_KEPALA_LAB_PASSWORD
  // karena merekalah yang menyiapkan peladen dan memasang berkas .env-nya.
  if (sandiBawaanDiabaikan()) {
    console.warn(
      "  PERINGATAN: SANDI_BAWAAN_ANGGOTA terlalu pendek dan diabaikan.\n" +
        "  Akun baru memakai kata sandi cadangan yang tertulis di src/lib/sandi.ts.",
    );
  }
  const hashUmum = await bcrypt.hash(sandiBawaan(), 12);
  const sandiDosen = process.env.SEED_KEPALA_LAB_PASSWORD;
  const hashDosen = sandiDosen ? await bcrypt.hash(sandiDosen, 12) : hashUmum;

  let dibuat = 0;
  let diperbarui = 0;

  for (const a of baris) {
    const npm = a.npm || null;
    if (npm && !npmValid(npm)) {
      throw new Error(`NPM tidak berbentuk 11 digit: "${npm}" pada anggota ${a.nama}`);
    }

    const turunan = npm ? prodiDariNpm(npm) : null;
    if (npm && !turunan && !a.prodi) {
      throw new Error(
        `Kode prodi pada NPM ${npm} (${a.nama}) belum dikenal. ` +
          `Tambahkan ke KODE_PRODI di src/lib/npm.ts atau isi kolom prodi di CSV.`,
      );
    }

    const angkatan = angkaAtau(a.angkatan!, npm ? angkatanDariNpm(npm) : null);
    const role = (a.role || "ANGGOTA") as Role;
    const jenjang = (a.jenjang || jenjangDariAngkatan(angkatan)) as Jenjang;
    const status = (a.status || "AKTIF") as StatusAnggota;

    const squadId = a.squad_kode ? (squadPerKode.get(a.squad_kode) ?? null) : null;
    if (a.squad_kode && !squadId) {
      throw new Error(`Kode squad "${a.squad_kode}" pada ${a.nama} tidak ada di squad-data.csv`);
    }

    const data = {
      nama: a.nama!,
      npm,
      email: a.email!.toLowerCase(),
      prodi: a.prodi || turunan?.prodi || "Belum diisi",
      fakultas: a.fakultas || turunan?.fakultas || "Teknik",
      angkatan,
      semester: angkaAtau(a.semester!, semesterBerjalan(angkatan, TAHUN_AJARAN)),
      squadId,
      role,
      jenjang,
      status,
    };

    const hashAwal = role === "KEPALA_LAB" || role === "PENGAWAS" ? hashDosen : hashUmum;

    const adaSebelumnya = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true, passwordHash: true },
    });

    // Akun yang sudah punya kata sandi tidak disentuh: seeder dijalankan ulang
    // tiap awal periode, dan menimpa kata sandi yang sudah dipilih sendiri akan
    // mengunci seisi laboratorium di luar sistemnya sendiri.
    const perluSandiAwal = !adaSebelumnya?.passwordHash;
    const sandiAwal = { passwordHash: hashAwal, wajibGantiSandi: true };

    await prisma.user.upsert({
      where: { email: data.email },
      update: { ...data, ...(perluSandiAwal ? sandiAwal : {}) },
      create: { ...data, ...sandiAwal },
    });

    if (adaSebelumnya) diperbarui++;
    else dibuat++;
  }

  console.log(`  anggota   : ${baris.length} (baru ${dibuat}, diperbarui ${diperbarui})`);
  return baris;
}

async function tetapkanKetuaSquad() {
  const baris = bacaCsv("squad-data.csv");
  for (const s of baris) {
    if (!s.npm_ketua) continue;
    const ketua = await prisma.user.findUnique({
      where: { npm: s.npm_ketua },
      select: { id: true, squadId: true },
    });
    if (!ketua) {
      throw new Error(`Ketua squad ${s.kode} dengan NPM ${s.npm_ketua} tidak ada di seed-data.csv`);
    }
    const squad = await prisma.squad.update({
      where: { kode: s.kode! },
      data: { ketuaId: ketua.id },
      select: { id: true, nama: true },
    });
    if (ketua.squadId !== squad.id) {
      throw new Error(
        `Ketua ${s.npm_ketua} terdaftar di squad lain. ` +
          `Seorang ketua wajib menjadi anggota squad yang dipimpinnya (${squad.nama}).`,
      );
    }
  }
  console.log(`  ketua     : ${baris.filter((s) => s.npm_ketua).length}`);
}

/**
 * Membuang sisa data uji coba yang tidak lagi tercantum di CSV.
 *
 * Tanpa ini, data contoh akan menetap selamanya: seeder hanya menyisipkan dan
 * memperbarui, jadi baris CONTOH- yang dihapus dari berkas tetap hidup di basis
 * data — dan ikut tercetak di label QR seolah aset sungguhan. Yang dibersihkan
 * hanya yang berawalan CONTOH-; aset sebenarnya tidak pernah disentuh, karena
 * seeder bukan tempat menghapus catatan yang dirawat manusia.
 *
 * Aset contoh yang pernah dipinjam sengaja TIDAK dihapus. Riwayat peminjaman
 * merujuk kepadanya, dan memutus rujukan itu menghapus bukti siapa memegang apa
 * — sekalipun bukti itu berasal dari uji coba.
 */
async function bersihkanAsetContoh(kodeDipakai: Set<string>): Promise<void> {
  const tersisa = await prisma.asset.findMany({
    where: { kodeAset: { startsWith: AWALAN_ASET_CONTOH, notIn: [...kodeDipakai] } },
    select: { id: true, kodeAset: true, _count: { select: { loans: true } } },
  });
  if (tersisa.length === 0) return;

  const bisaDihapus = tersisa.filter((a) => a._count.loans === 0);
  const berjejak = tersisa.filter((a) => a._count.loans > 0);

  if (bisaDihapus.length > 0) {
    await prisma.asset.deleteMany({ where: { id: { in: bisaDihapus.map((a) => a.id) } } });
    console.log(`              ${bisaDihapus.length} aset contoh lama dihapus.`);
  }
  if (berjejak.length > 0) {
    console.log(
      `              ${berjejak.length} aset contoh tidak dihapus karena punya riwayat\n` +
        `              peminjaman: ${berjejak.map((a) => a.kodeAset).join(", ")}.\n` +
        "              Halaman Inventaris pun akan menolak menghapusnya. Bila seluruh\n" +
        "              isinya memang masih data uji coba, kosongkan basis data dengan\n" +
        "              `npm run db:reset` lalu semai ulang.",
    );
  }
}

/**
 * Memuat master inventaris dari `data/aset-data.csv`.
 *
 * Idempoten menurut `kodeAset`: menjalankannya ulang memperbarui aset yang
 * sudah ada, bukan menggandakannya. Aset yang sedang dipinjam tidak terpengaruh,
 * karena pinjaman disimpan terpisah dari master asetnya.
 */
async function seedAset() {
  const baris = bacaCsv("aset-data.csv");
  if (baris.length === 0) {
    console.log("  aset      : 0 (data/aset-data.csv kosong)");
    await bersihkanAsetContoh(new Set());
    return;
  }

  const npmKePengguna = new Map(
    (await prisma.user.findMany({ where: { npm: { not: null } }, select: { id: true, npm: true } }))
      .filter((u): u is { id: string; npm: string } => u.npm !== null)
      .map((u) => [u.npm, u.id]),
  );

  let contoh = 0;
  const kodeDipakai = new Set<string>();
  for (const a of baris) {
    kodeDipakai.add(a.kode_aset!);
    if (a.kode_aset!.startsWith(AWALAN_ASET_CONTOH)) contoh++;

    const penanggungJawabId = a.penanggung_jawab_npm
      ? (npmKePengguna.get(a.penanggung_jawab_npm) ?? null)
      : null;
    if (a.penanggung_jawab_npm && !penanggungJawabId) {
      throw new Error(
        `Penanggung jawab NPM ${a.penanggung_jawab_npm} pada aset ${a.kode_aset} tidak ada di seed-data.csv`,
      );
    }

    const data = {
      nama: a.nama!,
      kategori: a.kategori!,
      merk: a.merk || null,
      jumlah: angkaAtau(a.jumlah!, 1) ?? 1,
      satuan: a.satuan || "unit",
      kondisi: (a.kondisi || "BAIK") as KondisiAset,
      lokasi: a.lokasi || "Belum ditentukan",
      tahunPerolehan: angkaAtau(a.tahun_perolehan!, null),
      penanggungJawabId,
      bolehDipinjam: (a.boleh_dipinjam || "ya").toLowerCase() !== "tidak",
      keterangan: a.keterangan || null,
    };

    await prisma.asset.upsert({
      where: { kodeAset: a.kode_aset! },
      update: data,
      create: { kodeAset: a.kode_aset!, ...data },
    });
  }

  console.log(`  aset      : ${baris.length}`);
  if (contoh > 0) {
    console.log(
      `              PERINGATAN: ${contoh} di antaranya masih data UJI COBA.\n` +
        "              Ganti data/aset-data.csv dengan master inventaris sebenarnya;\n" +
        "              menjalankan seeder lagi akan membuang sisa data uji coba.",
    );
  }
  await bersihkanAsetContoh(kodeDipakai);
}

async function seedPeriode() {
  const nama = "Semester Ganjil TA 2026/2027";
  const data = {
    nama,
    tanggalMulai: new Date("2026-09-01T00:00:00.000Z"),
    tanggalSelesai: new Date("2027-01-31T00:00:00.000Z"),
    // Target awal; Kepala Lab dapat mengubahnya lewat halaman Periode.
    targetHadir: 48, // ~3 hari per pekan selama 16 pekan
    targetSesiBerbagi: 2,
    targetPiket: 8,
    targetLogbook: 12,
    ambangLulus: 70,
    aktif: true,
  };

  const ada = await prisma.period.findFirst({ where: { nama } });
  if (ada) {
    await prisma.period.update({ where: { id: ada.id }, data });
  } else {
    // Hanya satu periode yang boleh aktif pada satu waktu.
    await prisma.period.updateMany({ where: { aktif: true }, data: { aktif: false } });
    await prisma.period.create({ data });
  }
  console.log(`  periode   : ${nama} (aktif)`);
}

async function main() {
  console.log("Menyemai basis data SILAB…");
  await seedSquad();
  await seedAnggota();
  await tetapkanKetuaSquad();
  await seedAset();
  await seedPeriode();

  const jumlah = await prisma.user.count();
  const perPeran = await prisma.user.groupBy({ by: ["role"], _count: true });
  console.log(`\nTotal anggota: ${jumlah}`);
  for (const p of perPeran.sort((a, b) => a.role.localeCompare(b.role))) {
    console.log(`  ${p.role.padEnd(20)} ${p._count}`);
  }
  console.log("\nSelesai.");
}

main()
  .catch((galat) => {
    console.error("\nSeeder gagal:", galat instanceof Error ? galat.message : galat);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
