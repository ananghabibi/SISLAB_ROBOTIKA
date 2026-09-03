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

import { spawnSync } from "node:child_process";
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
  // Dibangkitkan acak, bukan dibiarkan memakai nilai contoh: kata sandi bawaan
  // yang sama di setiap pemasangan berarti siapa pun yang pernah membaca
  // panduan ini tahu kata sandi awal setiap anggota baru di laboratorium mana
  // pun. Nilainya tampil sendiri di halaman Anggota saat perlu diserahkan.
  SANDI_BAWAAN_ANGGOTA: () => `silab-${randomBytes(5).toString("hex")}`,
  POSTGRES_PASSWORD: () => randomBytes(12).toString("hex"),
};

/** Nilai bawaan .env.example yang sebenarnya berarti "belum diisi". */
const NILAI_KOSONG = new Set([
  "",
  '""',
  "ubah-kata-sandi-ini",
  "ubah-setelah-login-pertama",
  "silab-ganti-sandi-saya",
]);

function bacaNilai(baris) {
  const cocok = baris.match(/^([A-Z_]+)=(.*)$/);
  return cocok ? { kunci: cocok[1], nilai: cocok[2].trim() } : null;
}

if (!existsSync(berkasContoh)) {
  console.error("Berkas .env.example tidak ditemukan. Jalankan dari dalam folder proyek.");
  process.exit(1);
}

const sudahAda = existsSync(berkasEnv);

/**
 * Menggabungkan .env yang sudah ada dengan .env.example.
 *
 * Sebelumnya berkas .env yang sudah ada dipakai apa adanya, dan akibatnya
 * baris BARU yang muncul di .env.example tidak pernah sampai ke pemasangan
 * yang sudah berjalan. Diamnya berbahaya: aplikasi lalu memakai nilai cadangan
 * yang tertulis di dalam kode — sama untuk setiap laboratorium — padahal
 * pengelolanya mengira sudah menjalankan penyiapan dengan benar.
 *
 * Nilai yang sudah diisi tidak pernah disentuh. Yang ditambahkan hanyalah
 * kunci yang memang belum ada, beserta komentar penjelasnya dari .env.example.
 * Kunci buatan sendiri yang tidak dikenal .env.example ikut dipertahankan di
 * bagian bawah, supaya penyesuaian setempat tidak hilang.
 */
function gabungkan(isiEnv, isiContoh) {
  const lama = new Map();
  for (const baris of isiEnv.split(/\r?\n/)) {
    const terurai = bacaNilai(baris);
    if (terurai) lama.set(terurai.kunci, baris);
  }

  const dipakai = new Set();
  const hasil = isiContoh.split(/\r?\n/).map((baris) => {
    const terurai = bacaNilai(baris);
    if (!terurai) return baris;
    if (lama.has(terurai.kunci)) {
      dipakai.add(terurai.kunci);
      return lama.get(terurai.kunci);
    }
    ditambahkan.push(terurai.kunci);
    return baris;
  });

  const asing = [...lama.keys()].filter((k) => !dipakai.has(k));
  if (asing.length > 0) {
    hasil.push("", "# --- Baris tambahan yang tidak ada di .env.example ---");
    for (const kunci of asing) hasil.push(lama.get(kunci));
  }

  return hasil.join("\n");
}

const ditambahkan = [];
const sumber = sudahAda
  ? gabungkan(readFileSync(berkasEnv, "utf8"), readFileSync(berkasContoh, "utf8"))
  : readFileSync(berkasContoh, "utf8");

// Salinan pengaman dibuat SEBELUM apa pun ditulis. Berkas .env memuat kunci
// rahasia yang tidak dapat dibuat ulang dari mana pun; kehilangannya karena
// skrip penyiapan akan jauh lebih mahal daripada satu berkas cadangan.
if (sudahAda) {
  writeFileSync(`${berkasEnv}.bak`, readFileSync(berkasEnv, "utf8"), "utf8");
}

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

function nilaiEnv(kunci) {
  return bacaNilai(hasil.split(/\r?\n/).find((b) => b.startsWith(`${kunci}=`)) ?? "")?.nilai;
}

/**
 * Mencoba kata sandi yang baru saja ditulis, selagi orangnya masih di sini.
 *
 * Tanpa ini, kata sandi yang salah baru ketahuan dua perintah kemudian sebagai
 * `P1000: Authentication failed` — jauh dari tempat ia diketik, sehingga yang
 * terbaca adalah "prisma bermasalah", bukan "kata sandi saya keliru".
 *
 * Kesalahan yang paling sering bukan salah ketik, melainkan menyalin teks
 * contoh dari panduan apa adanya. Karena itu pesannya menyebutkan kemungkinan
 * itu lebih dulu.
 *
 * Dilewati diam-diam bila Prisma belum terpasang: skrip ini memang dirancang
 * dapat berjalan tepat setelah `git clone`, sebelum `npm install`.
 */
function ujiSambungan() {
  const hasil = spawnSync("npx", ["prisma", "migrate", "status"], {
    cwd: akar,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (hasil.error) return;
  const keluaran = `${hasil.stdout ?? ""}${hasil.stderr ?? ""}`;
  if (!/P1000|Authentication failed/i.test(keluaran)) return;

  console.error("\n\x1b[31m" + "─".repeat(72));
  console.error("\x1b[1mKata sandi basis data itu ditolak PostgreSQL.\x1b[0m\x1b[31m");
  console.error("─".repeat(72) + "\x1b[0m");
  console.error(
    "\nPeriksa dulu: apakah yang Anda ketik tadi benar-benar kata sandi Anda,\n" +
      "atau teks contoh dari panduan yang tersalin apa adanya? Yang tertulis di\n" +
      "panduan hanyalah tempat kosong, bukan kata sandi yang berlaku.\n",
  );
  console.error("Kata sandi yang benar dapat diuji lebih dulu dengan psql:\n");
  console.error(
    '    "C:\\Program Files\\PostgreSQL\\16\\bin\\psql" -U postgres -h localhost -d postgres -c "select 1"\n',
  );
  console.error("Yang diterima psql itulah yang harus diketikkan di sini.\n");
  console.error("Berkas .env tetap tertulis; jalankan ulang perintah ini dengan kata");
  console.error("sandi yang benar dan DATABASE_URL akan ditimpa.\n");
  process.exitCode = 1;
}

const sandiMasuk = nilaiEnv("SEED_KEPALA_LAB_PASSWORD");
const sandiBawaanAnggota = nilaiEnv("SANDI_BAWAAN_ANGGOTA");

console.log(sudahAda ? "Berkas .env diperbarui." : "Berkas .env berhasil dibuat.");
if (sudahAda) console.log("  Salinan yang lama: .env.bak");
if (ditambahkan.length > 0) {
  console.log(`  Baris baru dari .env.example: ${ditambahkan.join(", ")}`);
}
console.log(
  diisi.length > 0 ? `  Baris yang diisi: ${diisi.join(", ")}` : "  Tidak ada yang perlu diisi.",
);
console.log("\nKata sandi masuk pertama kali sebagai Kepala Laboratorium:");
console.log("  Surel      : anang.habibi@unisma.ac.id");
console.log(`  Kata sandi : ${sandiMasuk}`);
console.log("\nKata sandi itu juga tersimpan di .env pada baris SEED_KEPALA_LAB_PASSWORD.");
console.log("\nKata sandi bawaan setiap anggota baru:");
console.log(`  ${sandiBawaanAnggota}`);
console.log("Akun yang masih memakainya hanya membuka Dasbor dan Profil sampai diganti sendiri.");
console.log("Bila seeder sudah pernah dijalankan sebelum baris ini terisi, jalankan ulang:");
console.log("  npx prisma db seed");

// Diuji hanya bila kata sandi basis datanya memang baru saja disetel di sini.
if (sandiDb) ujiSambungan();
