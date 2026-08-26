// -----------------------------------------------------------------------------
// Memasang atau mengganti kata sandi seorang anggota.
//
// Dua kegunaan:
//   1. Dosen atau pengawas lupa kata sandinya dan perlu dipulihkan dari peladen.
//   2. Menguji perbedaan menu antarperan di komputer sendiri, tanpa harus
//      menyiapkan kredensial Google OAuth lebih dulu.
//
// Pemakaian:
//   npm run sandi -- <surel> <kata-sandi>
//
// Perlu akses shell ke mesin peladen, yang berarti sudah punya akses basis data
// juga — jadi ini tidak membuka pintu baru. Penggantian dicatat di audit log.
// -----------------------------------------------------------------------------

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PANJANG_MINIMAL = 10;

async function main() {
  const [surel, sandi] = process.argv.slice(2);

  if (!surel || !sandi) {
    console.error("Pemakaian: npm run sandi -- <surel> <kata-sandi>");
    console.error("Contoh   : npm run sandi -- anang.habibi@unisma.ac.id RahasiaLab2026");
    process.exitCode = 1;
    return;
  }

  if (sandi.length < PANJANG_MINIMAL) {
    console.error(`Kata sandi minimal ${PANJANG_MINIMAL} karakter.`);
    process.exitCode = 1;
    return;
  }

  const anggota = await prisma.user.findUnique({
    where: { email: surel.toLowerCase() },
    select: { id: true, nama: true, role: true, status: true },
  });

  if (!anggota) {
    console.error(`Tidak ada anggota dengan surel ${surel}.`);
    console.error("Periksa data/seed-data.csv — surel harus persis sama.");
    process.exitCode = 1;
    return;
  }

  await prisma.user.update({
    where: { id: anggota.id },
    data: { passwordHash: await bcrypt.hash(sandi, 12) },
  });

  // Isi kata sandi tidak pernah masuk audit log; hanya faktanya yang dicatat.
  await prisma.auditLog.create({
    data: {
      userId: anggota.id,
      aksi: "SETEL_KATA_SANDI_DARI_PELADEN",
      entitas: "User",
      entitasId: anggota.id,
    },
  });

  console.log(`Kata sandi ${anggota.nama} (${anggota.role}) berhasil dipasang.`);
  if (anggota.status !== "AKTIF" && anggota.status !== "CUTI") {
    console.warn(
      `Peringatan: status anggota ini ${anggota.status}, sehingga tetap tidak dapat masuk.`,
    );
  }
}

main()
  .catch((galat) => {
    console.error("Gagal:", galat instanceof Error ? galat.message : galat);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
