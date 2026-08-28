import { afterEach, describe, expect, it, vi } from "vitest";

import { peringatanKameraTidakAman, pesanGalatKamera } from "@/lib/kamera";

/** Meniru peramban: `window` dan `navigator` tidak ada di lingkungan peladen. */
function pasangPeramban({ aman }: { aman: boolean }) {
  vi.stubGlobal("window", { isSecureContext: aman });
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: () => Promise.resolve(null) } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("peringatan sebelum kamera dicoba", () => {
  it("diam saja saat dirender di peladen", () => {
    // Bila ia menjawab di peladen, hasil render peladen dan peramban berbeda
    // dan React membatalkan hidrasinya.
    expect(peringatanKameraTidakAman()).toBeNull();
  });

  it("diam saja pada koneksi aman", () => {
    pasangPeramban({ aman: true });
    expect(peringatanKameraTidakAman()).toBeNull();
  });

  it("memperingatkan pada koneksi http sebelum tombol pindai ditekan", () => {
    pasangPeramban({ aman: false });
    const pesan = peringatanKameraTidakAman() ?? "";
    expect(pesan).toContain("http");
    expect(pesan).toContain("https");
    // Menyebut localhost, karena itu jalan keluar yang benar-benar ada di
    // laptop pengembangan dan tidak menuntut sertifikat apa pun.
    expect(pesan).toContain("localhost");
  });
});

describe("pesan galat kamera", () => {
  it("menyebut koneksi tidak aman lebih dulu, apa pun galat aslinya", () => {
    // Galat yang dilaporkan peramban pada keadaan ini menyesatkan — kerap
    // terbaca sebagai izin yang ditolak, padahal izinnya tidak pernah ditanyakan.
    pasangPeramban({ aman: false });
    const pesan = pesanGalatKamera(new DOMException("ditolak", "NotAllowedError"));
    expect(pesan).toContain("https");
  });

  it("menerjemahkan izin yang ditolak pada koneksi aman", () => {
    pasangPeramban({ aman: true });
    expect(pesanGalatKamera(new DOMException("ditolak", "NotAllowedError"))).toContain(
      "Izin kamera ditolak",
    );
  });

  it("menerjemahkan kamera yang sedang dipakai aplikasi lain", () => {
    pasangPeramban({ aman: true });
    expect(pesanGalatKamera(new DOMException("sibuk", "NotReadableError"))).toContain(
      "dipakai aplikasi lain",
    );
  });

  it("menyertakan galat aslinya untuk keadaan yang belum terpikirkan", () => {
    pasangPeramban({ aman: true });
    expect(pesanGalatKamera(new Error("sesuatu yang aneh"))).toContain("sesuatu yang aneh");
  });
});
