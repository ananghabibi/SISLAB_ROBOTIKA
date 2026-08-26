import { describe, expect, it } from "vitest";

import { asalPermintaan } from "@/lib/permintaan";

function h(nilai: Record<string, string>): Headers {
  return new Headers(nilai);
}

describe("asal permintaan untuk pengalihan", () => {
  it("memakai skema dari X-Forwarded-Proto, bukan menganggap http", () => {
    // Ini inti perbaikannya: di belakang Caddy berskema https, pengalihan yang
    // menganggap http akan melempar pengguna ke alamat yang tidak melayani.
    expect(asalPermintaan(h({ "x-forwarded-proto": "https", host: "silab.unisma.ac.id" }), "x")).toBe(
      "https://silab.unisma.ac.id",
    );
  });

  it("jatuh ke http bila tidak ada X-Forwarded-Proto", () => {
    expect(asalPermintaan(h({ host: "192.168.1.50" }), "x")).toBe("http://192.168.1.50");
  });

  it("mempertahankan porta bukan bawaan", () => {
    expect(asalPermintaan(h({ "x-forwarded-proto": "https", host: "localhost:4444" }), "x")).toBe(
      "https://localhost:4444",
    );
  });

  it("mendahulukan X-Forwarded-Host daripada Host", () => {
    expect(
      asalPermintaan(h({ "x-forwarded-host": "silab.unisma.ac.id", host: "app:3000" }), "x"),
    ).toBe("http://silab.unisma.ac.id");
  });

  it("mengambil entri pertama bila headernya berantai", () => {
    expect(
      asalPermintaan(h({ "x-forwarded-proto": "https, http", "x-forwarded-host": "a.id, b.id" }), "x"),
    ).toBe("https://a.id");
  });

  it("memakai cadangan hanya bila header host sama sekali tidak ada", () => {
    expect(asalPermintaan(h({}), "localhost:3000")).toBe("http://localhost:3000");
  });
});
