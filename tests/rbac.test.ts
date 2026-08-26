import { describe, expect, it } from "vitest";
import type { Role } from "@prisma/client";

import {
  bolehBaca,
  bolehHapus,
  bolehMenerbitkanSkk,
  bolehTulis,
  MATRIKS_AKSES,
  MODUL,
  peranHanyaBaca,
} from "@/lib/rbac";

const SEMUA_PERAN: Role[] = [
  "KEPALA_LAB",
  "KOORD_OPERASIONAL",
  "KOORD_RISET",
  "KOORD_PENGEMBANGAN",
  "KETUA_SQUAD",
  "ANGGOTA",
  "PENGAWAS",
];

describe("matriks hak akses", () => {
  it("mendefinisikan izin untuk setiap kombinasi modul dan peran", () => {
    for (const modul of MODUL) {
      for (const peran of SEMUA_PERAN) {
        expect(MATRIKS_AKSES[modul][peran], `${modul} × ${peran}`).toBeDefined();
      }
    }
  });

  it("hak tulis selalu disertai hak baca pada lingkup yang setara", () => {
    for (const modul of MODUL) {
      for (const peran of SEMUA_PERAN) {
        const izin = MATRIKS_AKSES[modul][peran];
        if (izin.tulis === "SEMUA") expect(izin.baca, `${modul} × ${peran}`).toBe("SEMUA");
        if (izin.tulis === "SENDIRI") expect(izin.baca, `${modul} × ${peran}`).not.toBe("TIDAK");
      }
    }
  });

  it("hak hapus hanya diberikan bersama hak tulis", () => {
    for (const modul of MODUL) {
      for (const peran of SEMUA_PERAN) {
        const izin = MATRIKS_AKSES[modul][peran];
        if (izin.hapus) expect(izin.tulis, `${modul} × ${peran}`).not.toBe("TIDAK");
      }
    }
  });
});

describe("aturan yang tidak boleh dilanggar (SPEC 4.2)", () => {
  it("PENGAWAS tidak pernah punya akses tulis pada modul mana pun", () => {
    expect(peranHanyaBaca("PENGAWAS")).toBe(true);
    for (const modul of MODUL) {
      expect(bolehTulis("PENGAWAS", modul), modul).toBe(false);
      expect(bolehHapus("PENGAWAS", modul), modul).toBe(false);
    }
  });

  it("hanya KEPALA_LAB yang dapat menerbitkan Surat Keterangan Kontribusi", () => {
    for (const peran of SEMUA_PERAN) {
      expect(bolehMenerbitkanSkk(peran)).toBe(peran === "KEPALA_LAB");
      if (peran !== "KEPALA_LAB") expect(bolehTulis(peran, "skk"), peran).toBe(false);
    }
  });

  it("hanya KEPALA_LAB yang mengubah peran dan mengatur periode", () => {
    for (const peran of SEMUA_PERAN) {
      const hanyaKepala = peran === "KEPALA_LAB";
      expect(bolehTulis(peran, "peran_hak_akses"), peran).toBe(hanyaKepala);
      expect(bolehTulis(peran, "periode_target"), peran).toBe(hanyaKepala);
      expect(bolehBaca(peran, "peran_hak_akses"), peran).toBe(hanyaKepala);
    }
  });

  it("absensi manual darurat hanya untuk KEPALA_LAB dan KOORD_OPERASIONAL", () => {
    for (const peran of SEMUA_PERAN) {
      const berhak = peran === "KEPALA_LAB" || peran === "KOORD_OPERASIONAL";
      expect(bolehTulis(peran, "absensi_manual"), peran).toBe(berhak);
    }
  });

  it("tidak ada peran yang boleh menghapus catatan absensi", () => {
    for (const peran of SEMUA_PERAN) {
      expect(bolehHapus(peran, "rekap_absensi"), peran).toBe(false);
      expect(bolehHapus(peran, "absensi_sendiri"), peran).toBe(false);
    }
  });

  it("audit log hanya terbaca oleh KEPALA_LAB dan KOORD_OPERASIONAL", () => {
    expect(MATRIKS_AKSES.audit_log.KEPALA_LAB.baca).toBe("SEMUA");
    expect(MATRIKS_AKSES.audit_log.KOORD_OPERASIONAL.baca).toBe("SENDIRI");
    for (const peran of SEMUA_PERAN) {
      if (peran === "KEPALA_LAB" || peran === "KOORD_OPERASIONAL") continue;
      expect(bolehBaca(peran, "audit_log"), peran).toBe(false);
    }
  });

  it("anggota dan ketua squad tidak melihat rekap absensi seluruh laboratorium", () => {
    expect(MATRIKS_AKSES.rekap_absensi.ANGGOTA.baca).toBe("SENDIRI");
    expect(MATRIKS_AKSES.rekap_absensi.KETUA_SQUAD.baca).toBe("SENDIRI");
  });
});
