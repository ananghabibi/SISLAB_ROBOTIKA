import { describe, expect, it } from "vitest";
import type { Role } from "@prisma/client";

import { menuUntukPeran } from "@/lib/menu";
import { aturanUntukJalur, peranBolehMembuka } from "@/lib/rute";

const SEMUA_PERAN: Role[] = [
  "KEPALA_LAB",
  "KOORD_OPERASIONAL",
  "KOORD_RISET",
  "KOORD_PENGEMBANGAN",
  "KETUA_SQUAD",
  "ANGGOTA",
  "PENGAWAS",
];

describe("pencocokan aturan rute", () => {
  it("memilih aturan paling khusus lebih dulu", () => {
    expect(aturanUntukJalur("/absensi/rekap")?.modul).toBe("rekap_absensi");
    expect(aturanUntukJalur("/absensi/manual")?.modul).toBe("absensi_manual");
    expect(aturanUntukJalur("/absensi")?.modul).toBe("absensi_sendiri");
    expect(aturanUntukJalur("/anggota/baru")?.butuh).toBe("tulis");
    expect(aturanUntukJalur("/anggota/abc123")?.butuh).toBe("baca");
  });

  it("tidak tertipu awalan yang mirip", () => {
    // "/anggotaan" bukan bagian dari "/anggota".
    expect(aturanUntukJalur("/anggotaan")).toBeUndefined();
  });

  it("membiarkan rute umum terbuka untuk semua peran yang sudah masuk", () => {
    for (const peran of SEMUA_PERAN) {
      expect(peranBolehMembuka(peran, "/dasbor"), peran).toBe(true);
      expect(peranBolehMembuka(peran, "/profil"), peran).toBe(true);
    }
  });
});

describe("penutupan rute per peran", () => {
  it("menutup /peran dan /periode untuk semua peran selain KEPALA_LAB", () => {
    for (const peran of SEMUA_PERAN) {
      const boleh = peran === "KEPALA_LAB";
      expect(peranBolehMembuka(peran, "/peran"), peran).toBe(boleh);
      expect(peranBolehMembuka(peran, "/periode"), peran).toBe(boleh);
    }
  });

  it("menutup /absensi/manual untuk peran tanpa jalur darurat", () => {
    expect(peranBolehMembuka("KOORD_RISET", "/absensi/manual")).toBe(false);
    expect(peranBolehMembuka("KETUA_SQUAD", "/absensi/manual")).toBe(false);
    expect(peranBolehMembuka("ANGGOTA", "/absensi/manual")).toBe(false);
    expect(peranBolehMembuka("KOORD_OPERASIONAL", "/absensi/manual")).toBe(true);
  });

  it("menutup absensi pribadi untuk PENGAWAS", () => {
    expect(peranBolehMembuka("PENGAWAS", "/absensi")).toBe(false);
    expect(peranBolehMembuka("PENGAWAS", "/absensi/rekap")).toBe(true);
  });

  it("menutup /audit untuk anggota dan ketua squad", () => {
    expect(peranBolehMembuka("ANGGOTA", "/audit")).toBe(false);
    expect(peranBolehMembuka("KETUA_SQUAD", "/audit")).toBe(false);
    expect(peranBolehMembuka("KEPALA_LAB", "/audit")).toBe(true);
  });
});

describe("menu mengikuti penjagaan rute", () => {
  it("tidak pernah menampilkan butir yang rutenya akan ditolak", () => {
    for (const peran of SEMUA_PERAN) {
      for (const butir of menuUntukPeran(peran)) {
        expect(peranBolehMembuka(peran, butir.href), `${peran} → ${butir.href}`).toBe(true);
      }
    }
  });

  it("menghasilkan menu yang berbeda untuk peran yang berbeda", () => {
    const kepala = menuUntukPeran("KEPALA_LAB").map((b) => b.href);
    const koordOps = menuUntukPeran("KOORD_OPERASIONAL").map((b) => b.href);
    const anggota = menuUntukPeran("ANGGOTA").map((b) => b.href);
    const pengawas = menuUntukPeran("PENGAWAS").map((b) => b.href);

    expect(kepala).toContain("/peran");
    expect(koordOps).not.toContain("/peran");
    expect(koordOps).toContain("/absensi/manual");
    expect(anggota).not.toContain("/absensi/manual");
    expect(anggota).not.toContain("/audit");
    expect(pengawas).not.toContain("/absensi");

    expect(new Set([kepala.length, koordOps.length, anggota.length, pengawas.length]).size)
      .toBeGreaterThan(1);
  });
});
