// -----------------------------------------------------------------------------
// Kriteria diterima Milestone 4.
//
// Tiga hal yang hanya bisa dibuktikan lewat peramban sungguhan:
//   1. Peminjaman tercatat lengkap dengan foto yang benar-benar terunggah.
//   2. Aset yang sama tidak bisa dipinjamkan dua kali lewat antarmuka —
//      penolakannya harus sampai ke layar petugas sebagai kalimat, bukan
//      sebagai halaman galat.
//   3. Anggota biasa hanya melihat pinjamannya sendiri dan ditolak pada jalur
//      penulisan, termasuk lembar label QR.
// -----------------------------------------------------------------------------

import { expect, test, type Page } from "@playwright/test";

import { AKUN_UJI, SANDI_UJI } from "./persiapan";

/** PNG 1x1 yang sah, cukup untuk melewati pemeriksaan bita penanda. */
const PNG_MUNGIL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function masuk(page: Page, surel: string) {
  await page.goto("/masuk");
  await page.getByLabel("Surel").fill(surel);
  await page.getByLabel("Kata sandi").fill(SANDI_UJI);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await page.waitForURL(/\/dasbor/);
}

async function isiFormulirPinjam(page: Page, kodeAset: string, keperluan: string) {
  await page.getByLabel("Kode aset").fill(kodeAset);

  const peminjam = page.getByLabel("Peminjam");
  const nilai = await peminjam.locator("option").nth(1).getAttribute("value");
  await peminjam.selectOption(nilai!);

  const besok = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  await page.getByLabel("Rencana kembali").fill(besok);
  await page.getByLabel("Keperluan").fill(keperluan);
  await page
    .getByLabel("Foto kondisi saat dipinjam")
    .setInputFiles({ name: "kondisi.png", mimeType: "image/png", buffer: PNG_MUNGIL });
  await page.getByRole("button", { name: "Catat peminjaman" }).click();
}

test.describe("peminjaman alat", () => {
  test("mencatat peminjaman, lalu menolak peminjaman kedua atas aset yang sama", async ({
    page,
  }) => {
    await masuk(page, AKUN_UJI.koordOperasional);

    // Kode aset diambil dari halaman inventaris, bukan ditulis tetap di uji:
    // isi CSV inventaris memang akan diganti data sebenarnya.
    await page.goto("/inventaris");
    const tautanPinjam = page.getByRole("link", { name: "Pinjamkan alat ini" }).first();
    await expect(tautanPinjam).toBeVisible();
    await tautanPinjam.click();
    await page.waitForURL(/\/peminjaman\/baru/);

    const kodeAset = await page.getByLabel("Kode aset").inputValue();
    expect(kodeAset).not.toBe("");

    await isiFormulirPinjam(page, kodeAset, "Uji peminjaman lewat peramban untuk Milestone 4");
    await expect(page.getByText(/tercatat dipinjam/)).toBeVisible();

    // Aset yang sama, sekali lagi. Ditolak basis data, bukan oleh pemeriksaan
    // di aplikasi — yang perlu dibuktikan: penolakannya sampai sebagai kalimat.
    await page.goto("/peminjaman/baru");
    await isiFormulirPinjam(page, kodeAset, "Uji peminjaman kedua atas aset yang sama");
    await expect(page.getByText(/sedang dipinjam dan belum dikembalikan/)).toBeVisible();

    // Alat itu kini muncul di daftar belum kembali.
    await page.goto("/peminjaman");
    await expect(page.getByText(kodeAset).first()).toBeVisible();
  });

  test("anggota biasa tidak boleh mencatat peminjaman maupun mencetak label", async ({ page }) => {
    await masuk(page, AKUN_UJI.anggota);

    await page.goto("/peminjaman");
    await expect(page.getByRole("heading", { name: "Peminjaman" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Catat peminjaman" })).toHaveCount(0);

    const jalurTulis = await page.request.get("/peminjaman/baru");
    expect(jalurTulis.status()).toBe(403);

    const label = await page.request.get("/api/inventaris/label-qr");
    expect(label.status()).toBe(403);
  });

  test("lembar label QR terbit sebagai PDF bagi pengurus", async ({ page }) => {
    await masuk(page, AKUN_UJI.koordOperasional);

    const jawaban = await page.request.get("/api/inventaris/label-qr");
    expect(jawaban.status()).toBe(200);
    expect(jawaban.headers()["content-type"]).toContain("application/pdf");

    const isi = await jawaban.body();
    expect(isi.subarray(0, 5).toString()).toBe("%PDF-");
    expect(isi.byteLength).toBeGreaterThan(5_000);
  });
});
