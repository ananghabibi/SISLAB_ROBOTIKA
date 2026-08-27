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

async function isiFormulirPinjam(
  page: Page,
  kodeAset: string,
  keperluan: string,
  { keluarLab = false, lampirkanIdentitas = true } = {},
) {
  await page.getByLabel("Kode aset").fill(kodeAset);

  // Dicocokkan persis: teks pada centang "Dibawa keluar laboratorium" juga
  // memuat kata "Peminjam", dan pencocokan sebagian akan mengenai keduanya.
  const peminjam = page.getByLabel("Peminjam", { exact: true });
  const nilai = await peminjam.locator("option").nth(1).getAttribute("value");
  await peminjam.selectOption(nilai!);

  const besok = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  await page.getByLabel("Rencana kembali").fill(besok);
  await page.getByLabel("Keperluan").fill(keperluan);
  await page
    .getByLabel("Foto kondisi saat dipinjam")
    .setInputFiles({ name: "kondisi.png", mimeType: "image/png", buffer: PNG_MUNGIL });

  if (keluarLab) {
    await page.getByLabel("Dibawa keluar laboratorium").check();
    if (lampirkanIdentitas) {
      await page
        .getByLabel("Foto KTM atau KTP peminjam")
        .setInputFiles({ name: "ktm.png", mimeType: "image/png", buffer: PNG_MUNGIL });
    } else {
      // Peramban akan menahan pengiriman karena kolomnya `required`; penjagaan
      // peladen yang sedang diuji, jadi wajibnya dilepas dari DOM lebih dulu.
      await page.getByLabel("Foto KTM atau KTP peminjam").evaluate((el) => {
        (el as HTMLInputElement).required = false;
      });
    }
  }

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

  test("alat yang dibawa keluar lab wajib disertai foto kartu identitas", async ({ page }) => {
    await masuk(page, AKUN_UJI.koordOperasional);

    await page.goto("/inventaris");
    const kodeAset = await page
      .getByRole("link", { name: "Pinjamkan alat ini" })
      .first()
      .getAttribute("href")
      .then((h) => new URL(h!, "http://x").searchParams.get("kode")!);

    // Kolom kartu identitas hanya muncul setelah dicentang.
    await page.goto("/peminjaman/baru");
    await expect(page.getByLabel("Foto KTM atau KTP peminjam")).toHaveCount(0);

    // Dicentang tanpa melampirkan apa pun: peladen menolak.
    await isiFormulirPinjam(page, kodeAset, "Uji dibawa keluar tanpa kartu identitas", {
      keluarLab: true,
      lampirkanIdentitas: false,
    });
    await expect(page.getByText(/wajib disertai foto KTM atau KTP/)).toBeVisible();

    // Dengan kartu identitas: diterima, dan alatnya ditandai di luar lab.
    await page.goto("/peminjaman/baru");
    await isiFormulirPinjam(page, kodeAset, "Uji dibawa keluar dengan kartu identitas", {
      keluarLab: true,
    });
    await expect(page.getByText(/dibawa keluar lab dengan jaminan kartu identitas/)).toBeVisible();

    await page.goto("/peminjaman");
    const baris = page.locator("li").filter({ hasText: kodeAset }).first();
    await expect(baris.getByText("Di luar lab")).toBeVisible();

    // Fotonya hanya boleh dibaca petugas — anggota biasa ditolak.
    const tautan = await baris.getByRole("link", { name: /lihat foto/ }).getAttribute("href");
    expect(tautan).toContain("/api/berkas/identitas/");

    await page.context().clearCookies();
    await masuk(page, AKUN_UJI.anggota);
    const dicoba = await page.request.get(tautan!);
    expect(dicoba.status()).toBe(403);
  });

  test("kepala lab boleh mencatat peminjaman", async ({ page }) => {
    // Menyimpang dari SPEC 4.2 atas permintaan Kepala Laboratorium; lihat
    // catatan kaki pada tabel matriks di SPEC.md. Diuji supaya penyimpangan itu
    // tidak diam-diam hilang saat matriksnya disentuh lagi kelak.
    await masuk(page, AKUN_UJI.kepalaLab);

    await page.goto("/peminjaman");
    await expect(page.getByRole("link", { name: "Catat peminjaman" })).toBeVisible();

    await page.goto("/inventaris");
    const kodeAset = await page
      .getByRole("link", { name: "Pinjamkan alat ini" })
      .first()
      .getAttribute("href")
      .then((h) => new URL(h!, "http://x").searchParams.get("kode")!);

    await page.goto("/peminjaman/baru");
    await isiFormulirPinjam(page, kodeAset, "Uji pencatatan oleh Kepala Laboratorium");
    await expect(page.getByText(/tercatat dipinjam/)).toBeVisible();
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
