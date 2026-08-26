// -----------------------------------------------------------------------------
// Kriteria diterima Milestone 2: "absensi manual muncul dengan penanda dan
// tercatat di audit log".
//
// Diuji lewat peramban sungguhan karena yang perlu dibuktikan bukan hanya
// datanya, melainkan juga gesekan yang disengaja pada jalur darurat ini:
// alasan tertulis yang panjang minimalnya dipaksa, dan pernyataan yang harus
// dicentang. Uji lewat API akan melewatkan keduanya.
// -----------------------------------------------------------------------------

import { expect, test } from "@playwright/test";

import { AKUN_UJI, SANDI_UJI } from "./persiapan";

const KOORD = AKUN_UJI.koordOperasional;
const SANDI = SANDI_UJI;

/** Anggota yang dicatatkan manual; dipilih lewat variabel agar mudah diganti. */
const ANGGOTA = process.env.ANGGOTA_UJI_MANUAL ?? "M. Farrel Fatahillah";

/** Memilih anggota pada daftar pilih, yang labelnya memuat NPM dan kode squad. */
async function pilihAnggota(page: import("@playwright/test").Page) {
  // Label harus dicocokkan persis: teks pernyataan centang di bawah formulir
  // juga memuat kata "anggota", dan pencocokan sebagian akan mengenai keduanya.
  const pilih = page.getByLabel("Anggota", { exact: true });
  const nilai = await pilih.locator("option", { hasText: ANGGOTA }).first().getAttribute("value");
  await pilih.selectOption(nilai!);
}

async function masuk(page: import("@playwright/test").Page, surel: string) {
  await page.goto("/masuk");
  await page.getByLabel("Surel").fill(surel);
  await page.getByLabel("Kata sandi").fill(SANDI);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL(/\/dasbor/);
}

test.describe("jalur darurat absensi manual", () => {
  test("menolak alasan yang terlalu pendek, lalu mencatat dengan penanda", async ({ page }) => {
    await masuk(page, KOORD);
    await page.goto("/absensi/manual");

    await expect(page.getByRole("heading", { name: "Absensi Manual" })).toBeVisible();
    await expect(page.getByText("sengaja dibuat merepotkan")).toBeVisible();

    // --- Alasan terlalu pendek: peramban sendiri yang menahan (minLength) ----
    await pilihAnggota(page);
    await page.getByLabel("Jam masuk (WIB)").fill("08:15");
    await page.getByLabel("Alasan pencatatan manual").fill("rusak");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Catat absensi manual" }).click();

    const alasan = page.getByLabel("Alasan pencatatan manual");
    await expect(alasan).toHaveJSProperty("validity.tooShort", true);

    // --- Alasan lengkap: tercatat ------------------------------------------
    await alasan.fill(
      "Monitor layar laboratorium mati sejak pukul 08.00 dan teknisi belum datang. Anggota hadir dan saya saksikan sendiri.",
    );
    await page.getByRole("button", { name: "Catat absensi manual" }).click();

    await expect(page.getByText("tercatat dan masuk audit log")).toBeVisible();

    // --- Penanda "Manual" terlihat di daftar hari ini -----------------------
    const daftar = page.getByRole("listitem").filter({ hasText: ANGGOTA });
    await expect(daftar).toContainText("Manual");
    // Lokal Indonesia menulis jam dengan titik: 08.15, bukan 08:15.
    await expect(daftar).toContainText("08.15");
    await expect(daftar).toContainText("Monitor layar laboratorium mati");
  });

  test("pencatatan kedua untuk orang yang sama pada hari yang sama ditolak", async ({ page }) => {
    await masuk(page, KOORD);
    await page.goto("/absensi/manual");

    await pilihAnggota(page);
    await page.getByLabel("Jam masuk (WIB)").fill("09:00");
    await page
      .getByLabel("Alasan pencatatan manual")
      .fill("Percobaan pencatatan kedua pada hari yang sama, seharusnya ditolak sistem.");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Catat absensi manual" }).click();

    await expect(page.getByText("sudah absen masuk hari ini")).toBeVisible();
  });
});

test("anggota biasa tidak dapat membuka jalur darurat", async ({ page }) => {
  await masuk(page, AKUN_UJI.anggota);
  const jawaban = await page.goto("/absensi/manual");
  expect(jawaban?.status()).toBe(403);
  await expect(page.getByText("bukan hak akses Anda")).toBeVisible();
});
