// -----------------------------------------------------------------------------
// Pemeriksaan sebelum `npm run dev` menyala.
//
// Dijalankan otomatis lewat skrip `predev`. Ada karena satu galat yang sama
// muncul berulang kali sesudah menarik pembaruan yang membawa migrasi baru:
//
//     PrismaClientValidationError
//     Invalid `prisma.user.findUnique()` invocation
//
// Galat itu tidak menyebutkan sebabnya sama sekali. Ia muncul jauh dari
// akarnya — di tengah halaman yang sedang dibuka, dengan jejak tumpukan yang
// menunjuk ke berkas yang sebenarnya tidak salah apa-apa — sehingga terbaca
// seperti kerusakan kode, padahal artinya cuma satu: kode sudah baru, Prisma
// Client atau basis datanya masih lama.
//
// Dua hal yang diperiksa di sini, dan urutannya penting:
//
//   1. Prisma Client sudah dibuat dari schema.prisma yang SEKARANG. Kalau
//      belum, klien dibuat ulang di tempat. Aman dilakukan di sini karena
//      peladen belum menyala; kalau ditunda sampai peladen jalan, Windows
//      menolaknya dengan EPERM karena berkas mesinnya sedang dipegang.
//   2. Tidak ada migrasi yang tertunda. Kalau ada, peladen TIDAK dinyalakan
//      dan perintah yang harus dijalankan dicetak apa adanya.
//
// Basis data yang belum menyala bukan alasan menggagalkan: pesannya
// diperingatkan, lalu peladen tetap dijalankan.
// -----------------------------------------------------------------------------

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKEMA = path.join(AKAR, "prisma", "schema.prisma");
const SKEMA_KLIEN = path.join(AKAR, "node_modules", ".prisma", "client", "schema.prisma");

const MERAH = "\x1b[31m";
const KUNING = "\x1b[33m";
const TEBAL = "\x1b[1m";
const MATI = "\x1b[0m";

/**
 * Menyamakan hal-hal yang tidak mengubah arti sebuah skema.
 *
 * Prisma merapikan sendiri skema yang disalinnya ke folder klien: kolomnya
 * diluruskan ulang, sehingga jumlah spasi di tengah baris berubah. Tanpa
 * penyamaan ini, perbandingan selalu menyatakan berbeda dan klien dibuat ulang
 * setiap kali `npm run dev` dijalankan — beberapa detik yang terbuang tiap kali,
 * untuk pekerjaan yang tidak perlu.
 */
function samakan(teks) {
  return teks
    .split(/\r?\n/)
    .map((baris) => baris.replace(/\s+/g, " ").trim())
    .filter((baris) => baris !== "")
    .join("\n");
}

/**
 * Benar bila Prisma Client dibuat dari skema yang berbeda dari yang sekarang.
 *
 * Prisma menyalin skemanya sendiri ke dalam folder klien saat pembuatan, jadi
 * perbandingan ini menjawab pertanyaannya secara langsung — bukan menebak dari
 * tanggal berkas, yang meleset setiap kali `git pull` menulis ulang berkas
 * tanpa mengubah isinya.
 */
function klienKetinggalan() {
  if (!existsSync(SKEMA_KLIEN)) return true;
  return samakan(readFileSync(SKEMA, "utf8")) !== samakan(readFileSync(SKEMA_KLIEN, "utf8"));
}

function jalankan(argumen) {
  return spawnSync("npx", ["prisma", ...argumen], {
    cwd: AKAR,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
}

if (klienKetinggalan()) {
  console.log(`${KUNING}Prisma Client dibuat dari skema yang lama. Membuat ulang…${MATI}`);
  const hasil = jalankan(["generate"]);
  if (hasil.status !== 0) {
    console.error(`${MERAH}Gagal membuat ulang Prisma Client.${MATI}`);
    console.error(hasil.stderr || hasil.stdout || "");
    console.error(
      "\nBila galatnya EPERM pada query_engine, ada `npm run dev` lain yang masih menyala.\n" +
        "Tutup jendelanya lebih dulu, lalu ulangi.",
    );
    process.exit(1);
  }
  console.log(`${KUNING}Prisma Client dibuat ulang.${MATI}\n`);
}

const status = jalankan(["migrate", "status"]);
const keluaran = `${status.stdout ?? ""}${status.stderr ?? ""}`;

// Basis data belum menyala. Bukan kesalahan yang perlu menghentikan peladen —
// pesan galat Prisma sendiri sudah menyebutkan alamat dan portanya, dan peladen
// yang menolak menyala hanya karena basis datanya belum sempat dihidupkan
// justru menghalangi urutan kerja yang wajar.
if (/P1001|Can't reach database server/i.test(keluaran)) {
  console.warn(`${KUNING}Basis data belum dapat dihubungi, migrasi belum diperiksa.${MATI}`);
  console.warn(`${KUNING}Nyalakan basis datanya, lalu jalankan: npm run db:migrate${MATI}\n`);
  process.exit(0);
}

// Berkas .env belum ada atau belum lengkap. Ditangani tersendiri karena
// pesannya berbeda dan penyelesaiannya pun berbeda.
if (/P1012|Environment variable not found/i.test(keluaran)) {
  console.warn(`${KUNING}DATABASE_URL belum disetel, migrasi belum diperiksa.${MATI}`);
  console.warn(`${KUNING}Jalankan: node scripts/siapkan-env.mjs${MATI}\n`);
  process.exit(0);
}

const adaTertunda =
  /not yet been applied|have not yet been applied|migrations? found in prisma\/migrations.*not/is.test(
    keluaran,
  ) || (status.status !== 0 && /pending|tertunda/i.test(keluaran));

if (adaTertunda) {
  const garis = "─".repeat(72);
  console.error(`\n${MERAH}${garis}`);
  console.error(`${TEBAL}Ada migrasi basis data yang belum dijalankan.${MATI}${MERAH}`);
  console.error(garis + MATI);
  console.error(
    "\nPeladen sengaja tidak dinyalakan. Kalau dipaksa jalan, halaman yang menyentuh\n" +
      "kolom baru akan gagal dengan PrismaClientValidationError yang tidak menyebutkan\n" +
      "sebabnya sama sekali.\n",
  );
  console.error(`${TEBAL}Jalankan ini lebih dulu:${MATI}\n`);
  console.error("    npm run db:migrate\n");
  console.error("Sesudah selesai, jalankan lagi npm run dev.\n");
  console.error(`${KUNING}Keluaran prisma migrate status:${MATI}`);
  console.error(keluaran.trim().replace(/^/gm, "    "));
  console.error("");
  process.exit(1);
}
