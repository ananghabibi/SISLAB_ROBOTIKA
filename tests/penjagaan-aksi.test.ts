import { readFileSync } from "node:fs";
import path from "node:path";

import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Uji struktural: setiap Server Action dan setiap Route Handler wajib
 * memanggil penjagaan hak akses.
 *
 * Ditulis sebagai pembacaan berkas sumber, bukan pemanggilan fungsi, karena
 * yang dijaga di sini bukan perilaku satu fungsi melainkan sebuah KEBIASAAN:
 * setiap kali seseorang menambah aksi baru setahun lagi, uji ini gagal bila
 * penjagaannya lupa dipasang. Menyembunyikan tombol bukan pengamanan, dan
 * satu aksi yang lolos tanpa penjagaan membatalkan seluruh matriks hak akses.
 */

const AKAR = path.resolve(__dirname, "..");

const PENJAGA = ["wajibIzin(", "wajibPeran(", "wajibMasuk("];

/**
 * Aksi yang memang harus dapat dijangkau TANPA sesi, beserta alasannya.
 * Daftar ini sengaja pendek dan wajib disertai alasan; menambahkan nama ke
 * sini adalah keputusan yang harus terlihat pada tinjauan kode.
 */
const TANPA_SESI: Record<string, string> = {
  "src/app/masuk/aksi.ts": "Halaman masuk memang dipakai sebelum ada sesi.",
};

/** Rute yang penjagaannya bukan sesi, melainkan lapis lain. */
const RUTE_PENJAGA_LAIN: Record<string, string> = {
  "src/app/api/auth/[...nextauth]/route.ts": "Ditangani Auth.js sendiri.",
  "src/app/api/cron/kode-harian/route.ts": "Dijaga CRON_SECRET, bukan sesi.",
  "src/app/api/cron/tandai-terlambat/route.ts": "Dijaga CRON_SECRET, bukan sesi.",
  "src/app/api/display/qr/route.ts": "Dijaga lapis jaringan; layar lab tidak login.",
  "src/app/api/display/status/route.ts": "Dijaga lapis jaringan; layar lab tidak login.",
  "src/app/api/attendance/route.ts": "Dijaga lapis jaringan, kode harian, dan token QR.",
};

function berkas(pola: string): string[] {
  return globSync(pola, { cwd: AKAR }).sort();
}

/** Memotong badan sebuah fungsi dengan mencocokkan kurung kurawal. */
function badanFungsi(isi: string, mulai: number): string {
  const buka = isi.indexOf("{", mulai);
  if (buka === -1) return "";
  let dalam = 0;
  for (let i = buka; i < isi.length; i++) {
    if (isi[i] === "{") dalam++;
    else if (isi[i] === "}") {
      dalam--;
      if (dalam === 0) return isi.slice(buka, i + 1);
    }
  }
  return isi.slice(buka);
}

describe("penjagaan pada setiap Server Action", () => {
  const daftar = berkas("src/**/aksi.ts");

  it("menemukan berkas aksi untuk diperiksa", () => {
    // Bila pola berkasnya berubah, uji ini harus gagal — bukan lulus karena
    // tidak menemukan apa pun.
    expect(daftar.length).toBeGreaterThanOrEqual(10);
  });

  it("setiap fungsi yang diekspor memanggil penjagaan hak akses", () => {
    const lolos: string[] = [];

    for (const p of daftar) {
      const isi = readFileSync(path.join(AKAR, p), "utf8");
      if (TANPA_SESI[p]) continue;

      const pola = /export async function (\w+)/g;
      let cocok: RegExpExecArray | null;
      while ((cocok = pola.exec(isi)) !== null) {
        const badan = badanFungsi(isi, cocok.index);
        if (!PENJAGA.some((g) => badan.includes(g))) {
          lolos.push(`${p} → ${cocok[1]}()`);
        }
      }
    }

    expect(lolos).toEqual([]);
  });
});

describe("penjagaan pada setiap Route Handler", () => {
  const daftar = berkas("src/app/api/**/route.ts");

  it("menemukan berkas rute untuk diperiksa", () => {
    expect(daftar.length).toBeGreaterThanOrEqual(8);
  });

  it("setiap rute dijaga sesi, atau tercatat memakai penjagaan lain", () => {
    const lolos: string[] = [];

    for (const p of daftar) {
      if (RUTE_PENJAGA_LAIN[p]) continue;
      const isi = readFileSync(path.join(AKAR, p), "utf8");
      if (!PENJAGA.some((g) => isi.includes(g))) lolos.push(p);
    }

    expect(lolos).toEqual([]);
  });

  it("setiap pengecualian menyebutkan alasannya", () => {
    for (const [rute, alasan] of Object.entries(RUTE_PENJAGA_LAIN)) {
      expect(alasan.length, rute).toBeGreaterThan(10);
    }
    for (const [aksi, alasan] of Object.entries(TANPA_SESI)) {
      expect(alasan.length, aksi).toBeGreaterThan(10);
    }
  });

  it("rute cron benar-benar memeriksa rahasia bersamanya", () => {
    // Pengecualian di atas hanya sah bila penjagaannya memang ada. Yang
    // dicocokkan adalah pemanggilan penjaganya, bukan nama variabel
    // lingkungannya — rahasianya dibaca di `src/lib/cron.ts`, bukan di rutenya.
    for (const p of Object.keys(RUTE_PENJAGA_LAIN)) {
      if (!p.includes("/cron/")) continue;
      expect(readFileSync(path.join(AKAR, p), "utf8"), p).toContain("rahasiaCronCocok(");
    }
  });

  it("rute display benar-benar memeriksa lapis jaringan", () => {
    for (const p of Object.keys(RUTE_PENJAGA_LAIN)) {
      if (!p.includes("/display/") && !p.includes("/attendance")) continue;
      expect(readFileSync(path.join(AKAR, p), "utf8"), p).toContain("periksaJaringan");
    }
  });
});

describe("aturan rumah yang tidak boleh dilanggar", () => {
  it("kode harian tidak pernah keluar lewat rute API mana pun", () => {
    // Kode harian hanya boleh tampil di layar /display. Sekali ia masuk sebuah
    // tanggapan API, ia dapat dibaca dari luar ruangan dan lapis kedua hilang.
    const melanggar: string[] = [];
    for (const p of berkas("src/app/api/**/route.ts")) {
      const isi = readFileSync(path.join(AKAR, p), "utf8");
      // Yang dilarang adalah MEMILIH kolom kodenya dari basis data di dalam
      // rute; pencocokan kode yang dikirim pemohon justru memang tugasnya.
      if (/dailyCode[\s\S]{0,200}?select:[\s\S]{0,120}?\bkode\s*:\s*true/.test(isi)) {
        melanggar.push(p);
      }
    }
    expect(melanggar).toEqual([]);
  });

  it("tidak ada satu pun kode yang menghapus catatan absensi", () => {
    // Koreksi memakai catatan pembatalan yang merujuk catatan asli, bukan
    // penghapusan. Berlaku untuk seluruh peran, termasuk Kepala Lab.
    const melanggar: string[] = [];
    for (const p of berkas("src/**/*.ts")) {
      if (p.startsWith("tests/")) continue;
      const isi = readFileSync(path.join(AKAR, p), "utf8");
      if (/attendance\.delete(Many)?\s*\(/.test(isi)) melanggar.push(p);
    }
    expect(melanggar).toEqual([]);
  });

  it("tidak ada satu pun kode yang menghapus atau menyunting audit log", () => {
    // Jejak yang dapat dihapus akan dihapus persis saat ia paling perlu dibaca.
    const melanggar: string[] = [];
    for (const p of berkas("src/**/*.ts")) {
      const isi = readFileSync(path.join(AKAR, p), "utf8");
      if (/auditLog\.(delete|update)(Many)?\s*\(/.test(isi)) melanggar.push(p);
    }
    expect(melanggar).toEqual([]);
  });

  it("tidak ada satu pun kode yang menghapus Surat Keterangan Kontribusi", () => {
    // Surat yang sudah keluar mungkin sudah dicetak dan dikirim ke Program Studi.
    const melanggar: string[] = [];
    for (const p of berkas("src/**/*.ts")) {
      const isi = readFileSync(path.join(AKAR, p), "utf8");
      if (/\bskk\.(delete|update)(Many)?\s*\(/.test(isi)) melanggar.push(p);
    }
    expect(melanggar).toEqual([]);
  });
});
