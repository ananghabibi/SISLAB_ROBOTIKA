// -----------------------------------------------------------------------------
// Menyiapkan atau memperbaiki berkas .env.
//
// Dijalankan tanpa argumen:
//   - Bila .env belum ada, dibuat dari .env.example dan seluruh nilai acak diisi.
//   - Bila .env sudah ada, hanya baris rahasia yang MASIH KOSONG yang diisi.
//     Nilai yang sudah Anda tulis sendiri tidak pernah ditimpa.
//
// Dengan --sandi-db, baris DATABASE_URL disusun ulang memakai kata sandi
// PostgreSQL Anda — supaya tidak perlu menyunting berkasnya lewat Notepad:
//
//   node scripts/siapkan-env.mjs --sandi-db airosa
//   node scripts/siapkan-env.mjs --sandi-db airosa --pengguna-db postgres
//
// Ditulis sebagai JavaScript polos tanpa satu pun dependensi, supaya bisa
// dijalankan tepat setelah `git clone` dan berjalan sama di Windows, macOS,
// maupun Linux.
// -----------------------------------------------------------------------------

import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const akar = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const berkasContoh = path.join(akar, ".env.example");
const berkasEnv = path.join(akar, ".env");

function argumen(nama) {
  const i = process.argv.indexOf(`--${nama}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const sandiDb = argumen("sandi-db");
const penggunaDb = argumen("pengguna-db") ?? "postgres";
const namaDb = argumen("nama-db") ?? "silab";

/** Nilai acak untuk baris rahasia yang masih kosong. */
const pembangkit = {
  AUTH_SECRET: () => randomBytes(32).toString("base64"),
  QR_TOKEN_SECRET: () => randomBytes(32).toString("hex"),
  CRON_SECRET: () => randomBytes(32).toString("hex"),
  SEED_KEPALA_LAB_PASSWORD: () => `lab-${randomBytes(4).toString("hex")}`,
  POSTGRES_PASSWORD: () => randomBytes(12).toString("hex"),
};

/** Nilai bawaan .env.example yang sebenarnya berarti "belum diisi". */
const NILAI_KOSONG = new Set(["", '""', "ubah-kata-sandi-ini", "ubah-setelah-login-pertama"]);

function bacaNilai(baris) {
  const cocok = baris.match(/^([A-Z_]+)=(.*)$/);
  return cocok ? { kunci: cocok[1], nilai: cocok[2].trim() } : null;
}

if (!existsSync(berkasContoh)) {
  console.error("Berkas .env.example tidak ditemukan. Jalankan dari dalam folder proyek.");
  process.exit(1);
}

const sudahAda = existsSync(berkasEnv);
const sumber = readFileSync(sudahAda ? berkasEnv : berkasContoh, "utf8");

const diisi = [];
let hasil = sumber
  .split(/\r?\n/)
  .map((baris) => {
    const terurai = bacaNilai(baris);
    if (!terurai) return baris;
    const { kunci, nilai } = terurai;

    if (kunci in pembangkit && NILAI_KOSONG.has(nilai)) {
      diisi.push(kunci);
      return `${kunci}=${pembangkit[kunci]()}`;
    }
    return baris;
  })
  .join("\n");

// DATABASE_URL disusun dari kata sandi yang diberikan, atau — pada berkas baru —
// dari POSTGRES_PASSWORD acak yang baru saja dibuat.
const sandiUntukUrl =
  sandiDb ?? (sudahAda ? null : bacaNilai(hasil.split(/\r?\n/).find((b) => b.startsWith("POSTGRES_PASSWORD=")) ?? "")?.nilai);

if (sandiUntukUrl) {
  const pengguna = sandiDb ? penggunaDb : "silab";
  // Kata sandi disandikan supaya tanda seperti @ : / # tetap aman di dalam URL.
  const url = `postgresql://${encodeURIComponent(pengguna)}:${encodeURIComponent(sandiUntukUrl)}@localhost:5432/${namaDb}?schema=public`;
  hasil = hasil.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL="${url}"`);
  if (sandiDb) diisi.push("DATABASE_URL");
}

writeFileSync(berkasEnv, hasil, "utf8");

const sandiMasuk = bacaNilai(
  hasil.split(/\r?\n/).find((b) => b.startsWith("SEED_KEPALA_LAB_PASSWORD=")) ?? "",
)?.nilai;

console.log(sudahAda ? "Berkas .env diperbarui." : "Berkas .env berhasil dibuat.");
console.log(
  diisi.length > 0 ? `  Baris yang diisi: ${diisi.join(", ")}` : "  Tidak ada yang perlu diisi.",
);
console.log("\nKata sandi masuk pertama kali sebagai Kepala Laboratorium:");
console.log("  Surel      : anang.habibi@unisma.ac.id");
console.log(`  Kata sandi : ${sandiMasuk}`);
console.log("\nKata sandi itu juga tersimpan di .env pada baris SEED_KEPALA_LAB_PASSWORD.");
console.log("Bila seeder sudah pernah dijalankan sebelum baris ini terisi, jalankan ulang:");
console.log("  npx prisma db seed");
