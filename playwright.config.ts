import { defineConfig } from "@playwright/test";

/**
 * Uji alur absensi lewat peramban sungguhan (SPEC bagian 2.1).
 *
 * Peladen uji dijalankan terpisah oleh `scripts/uji-e2e.sh`, bukan oleh
 * `webServer` bawaan Playwright, karena ia perlu variabel lingkungan khusus:
 * subnet laboratorium palsu dan kunci token QR yang diketahui berkas uji.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/persiapan.ts",
  testIgnore: ["**/persiapan.ts"],
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  reporter: [["list"]],
  use: {
    baseURL: process.env.ALAMAT_UJI ?? "http://127.0.0.1:3500",
    // Semua permintaan diperlakukan seolah datang dari dalam laboratorium.
    extraHTTPHeaders: { "X-Forwarded-For": "192.168.1.42" },
    // Peramban boleh ditunjuk lewat CHROMIUM_UJI bila lingkungan sudah
    // menyediakannya, supaya tidak perlu mengunduh salinan kedua.
    ...(process.env.CHROMIUM_UJI ? { launchOptions: { executablePath: process.env.CHROMIUM_UJI } } : {}),
  },
});
