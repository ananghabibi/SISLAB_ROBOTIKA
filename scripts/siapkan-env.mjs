// -----------------------------------------------------------------------------
// Menyiapkan berkas .env untuk pengembangan di laptop.
//
// Menyalin .env.example lalu mengisi sendiri seluruh nilai acak yang
// dibutuhkan. Ditulis sebagai JavaScript polos tanpa satu pun dependensi,
// supaya bisa dijalankan tepat setelah `git clone` — bahkan sebelum
// `npm install` selesai — dan berjalan sama di Windows, macOS, maupun Linux.
//
//   node scripts/siapkan-env.mjs
// -----------------------------------------------------------------------------

import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const akar = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const berkasContoh = path.join(akar, ".env.example");
const berkasEnv = path.join(akar, ".env");

if (existsSync(berkasEnv)) {
  console.log("Berkas .env sudah ada — tidak diubah.");
  console.log("Hapus dulu berkas itu bila ingin dibuat ulang dari awal.");
  process.exit(0);
}

if (!existsSync(berkasContoh)) {
  console.error("Berkas .env.example tidak ditemukan. Jalankan dari folder proyek.");
  process.exit(1);
}

const sandiDb = randomBytes(12).toString("hex");
const nilai = {
  POSTGRES_PASSWORD: sandiDb,
  DATABASE_URL: `"postgresql://silab:${sandiDb}@localhost:5432/silab?schema=public"`,
  AUTH_SECRET: randomBytes(32).toString("base64"),
  QR_TOKEN_SECRET: randomBytes(32).toString("hex"),
  CRON_SECRET: randomBytes(32).toString("hex"),
  SEED_KEPALA_LAB_PASSWORD: `lab-${randomBytes(4).toString("hex")}`,
};

const hasil = readFileSync(berkasContoh, "utf8")
  .split(/\r?\n/)
  .map((baris) => {
    const cocok = baris.match(/^([A-Z_]+)=/);
    if (!cocok) return baris;
    const kunci = cocok[1];
    return kunci in nilai ? `${kunci}=${nilai[kunci]}` : baris;
  })
  .join("\n");

writeFileSync(berkasEnv, hasil, "utf8");

console.log("Berkas .env berhasil dibuat.\n");
console.log("Kata sandi masuk pertama kali sebagai Kepala Laboratorium:");
console.log(`  Surel      : anang.habibi@unisma.ac.id`);
console.log(`  Kata sandi : ${nilai.SEED_KEPALA_LAB_PASSWORD}\n`);
console.log("Catat kata sandi itu — ia hanya ditampilkan sekarang, dan tersimpan");
console.log("di berkas .env pada baris SEED_KEPALA_LAB_PASSWORD.\n");
console.log("Yang masih perlu diisi sendiri (baru dibutuhkan nanti):");
console.log("  AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET  -> untuk masuk lewat Google");
console.log("  LAB_SUBNETS                          -> subnet WiFi laboratorium");
