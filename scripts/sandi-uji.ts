// -----------------------------------------------------------------------------
// Menyiapkan akun uji: satu orang untuk setiap peran, dengan kata sandi sama.
//
// Dipakai untuk mencoba perbedaan menu dan penolakan hak akses tanpa perlu
// menyiapkan kredensial Google lebih dulu. Anggota mahasiswa di laboratorium
// masuk lewat Google dan tidak punya kata sandi — akun uji ini menambahkannya
// hanya untuk keperluan pengembangan.
//
//   npm run sandi:uji -- KataSandiUji2026
//
// Dua pengaman, karena satu kata sandi yang sama untuk enam peran adalah hal
// yang berbahaya bila sampai terpakai di laboratorium:
//   1. Menolak berjalan saat NODE_ENV=production.
//   2. Kata sandi wajib diketik sendiri; tidak ada nilai bawaan yang bisa
//      ditebak orang lain dari membaca kode ini.
// -----------------------------------------------------------------------------

import { PrismaClient, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PANJANG_MINIMAL = 10;

/** Satu wakil untuk tiap peran, diambil dari data/seed-data.csv. */
const WAKIL_PERAN: { peran: Role; surel: string }[] = [
  { peran: "KEPALA_LAB", surel: "anang.habibi@unisma.ac.id" },
  { peran: "KOORD_OPERASIONAL", surel: "22401053014@student.unisma.ac.id" },
  { peran: "KOORD_RISET", surel: "22401053033@student.unisma.ac.id" },
  { peran: "KOORD_PENGEMBANGAN", surel: "22401053025@student.unisma.ac.id" },
  { peran: "KETUA_SQUAD", surel: "22301053029@student.unisma.ac.id" },
  { peran: "ANGGOTA", surel: "22501053005@student.unisma.ac.id" },
];

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("Ditolak: perintah ini tidak boleh dijalankan di lingkungan produksi.");
    console.error("Di laboratorium, pasang kata sandi satu per satu dengan `npm run sandi`.");
    process.exitCode = 1;
    return;
  }

  const sandi = process.argv[2];
  if (!sandi || sandi.length < PANJANG_MINIMAL) {
    console.error("Pemakaian: npm run sandi:uji -- <kata-sandi>");
    console.error(`Kata sandi wajib diisi sendiri, minimal ${PANJANG_MINIMAL} karakter.`);
    process.exitCode = 1;
    return;
  }

  const hash = await bcrypt.hash(sandi, 10);
  const baris: string[] = [];

  for (const { peran, surel } of WAKIL_PERAN) {
    const anggota = await prisma.user.findUnique({
      where: { email: surel },
      select: { id: true, nama: true, role: true },
    });

    if (!anggota) {
      baris.push(`  ${peran.padEnd(19)} ${surel.padEnd(36)} TIDAK ADA di basis data`);
      continue;
    }

    await prisma.user.update({ where: { id: anggota.id }, data: { passwordHash: hash } });
    baris.push(`  ${anggota.role.padEnd(19)} ${surel.padEnd(36)} ${anggota.nama}`);
  }

  console.log("Akun uji siap. Kata sandi untuk semuanya sama seperti yang Anda ketik.\n");
  console.log(`  ${"PERAN".padEnd(19)} ${"SUREL".padEnd(36)} NAMA`);
  console.log(`  ${"-".repeat(19)} ${"-".repeat(36)} ${"-".repeat(28)}`);
  for (const b of baris) console.log(b);
  console.log("\nCatatan: tidak ada akun PENGAWAS pada data awal. Bila perlu mencobanya,");
  console.log("ubah peran salah satu anggota lewat halaman Anggota, lalu jalankan ulang.");
}

main()
  .catch((galat) => {
    console.error("Gagal:", galat instanceof Error ? galat.message : galat);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
