// -----------------------------------------------------------------------------
// Impor absensi lama dari CSV hasil ekspor Google Sheets (SPEC bagian 7, M6).
//
//   npx tsx scripts/impor-absensi.ts data/absensi-lama.csv          # periksa saja
//   npx tsx scripts/impor-absensi.ts data/absensi-lama.csv --tulis  # simpan
//
// Menolak lebih dulu, menulis belakangan. Tanpa `--tulis` skrip ini hanya
// membaca dan melaporkan — berapa baris sah, berapa ditolak, dan baris ke
// berapa yang salah beserta sebabnya. Impor data absensi bertahun-tahun ke
// dalam basis data yang sudah berisi adalah tindakan yang sulit dibatalkan,
// dan orang berhak melihat dulu apa yang akan terjadi.
//
// Barisnya masuk sebagai catatan MANUAL dengan alasan yang menyebut berkas
// asalnya. Itu bukan hiasan: rekap dan audit menampilkan penanda "Manual", dan
// siapa pun yang membacanya setahun lagi harus tahu bahwa angka itu berasal
// dari spreadsheet lama, bukan dari pemindaian QR di pintu laboratorium.
//
// Aturan "satu sesi per orang per hari" ditegakkan basis data. Baris yang
// bentrok dengan catatan yang sudah ada DILEWATI, tidak menimpa: tidak ada
// peran yang boleh mengubah catatan absensi, dan skrip pun tidak.
// -----------------------------------------------------------------------------

import { readFileSync } from "node:fs";
import path from "node:path";

import { uraiCsv } from "../src/lib/csv";
import { uraiBarisAbsensi } from "../src/lib/impor";
import { prisma } from "../src/lib/prisma";

const argumen = process.argv.slice(2);
const berkas = argumen.find((a) => !a.startsWith("--"));
const tulis = argumen.includes("--tulis");

if (!berkas) {
  console.error("Sebutkan berkas CSV-nya:");
  console.error("  npx tsx scripts/impor-absensi.ts data/absensi-lama.csv [--tulis]");
  process.exit(1);
}

async function main() {
  const isi = readFileSync(path.resolve(berkas!), "utf8");
  const baris = uraiCsv(isi);
  console.log(`Membaca ${baris.length} baris dari ${berkas}\n`);

  const sah: ReturnType<typeof uraiBarisAbsensi>[] = [];
  const ditolak: { nomor: number; alasan: string }[] = [];

  baris.forEach((kolom, i) => {
    const hasil = uraiBarisAbsensi(kolom);
    // +2: satu untuk baris kepala, satu karena manusia menghitung dari 1.
    if (hasil.ok) sah.push(hasil);
    else ditolak.push({ nomor: i + 2, alasan: hasil.alasan });
  });

  if (ditolak.length > 0) {
    console.log(`${ditolak.length} baris DITOLAK:`);
    for (const d of ditolak.slice(0, 30)) console.log(`  baris ${d.nomor}: ${d.alasan}`);
    if (ditolak.length > 30) console.log(`  … dan ${ditolak.length - 30} baris lagi`);
    console.log("");
  }

  const npmDipakai = [...new Set(sah.flatMap((s) => (s.ok ? [s.baris.npm] : [])))];
  const anggota = await prisma.user.findMany({
    where: { npm: { in: npmDipakai } },
    select: { id: true, npm: true },
  });
  const idPerNpm = new Map(anggota.map((a) => [a.npm!, a.id]));

  const tanpaAnggota = npmDipakai.filter((n) => !idPerNpm.has(n));
  if (tanpaAnggota.length > 0) {
    console.log(`${tanpaAnggota.length} NPM tidak ada di daftar anggota, barisnya dilewati:`);
    console.log(`  ${tanpaAnggota.join(", ")}\n`);
  }

  const siap = sah.flatMap((s) => (s.ok && idPerNpm.has(s.baris.npm) ? [s.baris] : []));
  console.log(`${siap.length} baris siap disimpan.`);

  if (!tulis) {
    console.log("\nBelum ada yang ditulis. Jalankan ulang dengan --tulis bila hasil di atas benar.");
    return;
  }

  let masuk = 0;
  let dilewati = 0;
  const asal = path.basename(berkas!);

  for (const b of siap) {
    const userId = idPerNpm.get(b.npm)!;
    const adaSudah = await prisma.attendance.findUnique({
      where: { userId_tanggal: { userId, tanggal: b.tanggal } },
      select: { id: true },
    });
    if (adaSudah) {
      dilewati++;
      continue;
    }

    await prisma.attendance.create({
      data: {
        userId,
        tanggal: b.tanggal,
        jamMasuk: b.jamMasuk,
        jamKeluar: b.jamKeluar,
        jenisKegiatan: b.jenisKegiatan,
        uraian: b.uraian,
        ipMasuk: "impor-csv",
        manual: true,
        alasanManual: `Impor data awal dari berkas ${asal}. Catatan ini tidak berasal dari pemindaian QR di laboratorium.`,
      },
    });
    masuk++;
  }

  console.log(`\nTersimpan : ${masuk}`);
  console.log(`Dilewati  : ${dilewati} (sudah ada catatan pada tanggal itu)`);
}

main()
  .catch((galat) => {
    console.error(galat);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
