// -----------------------------------------------------------------------------
// Kriteria diterima Milestone 3: "anggota tidak bisa melihat skor anggota lain
// lewat API mana pun". Yang diuji di sini adalah penyaring yang menegakkannya.
// -----------------------------------------------------------------------------

import { describe, expect, it } from "vitest";
import type { Role } from "@prisma/client";

import { saringanRekapKontribusi } from "@/lib/lingkup";

function pengguna(role: Role, squadId: string | null = "squad-vtol") {
  return { id: "orang-ini", role, squadId };
}

describe("lingkup rekap kontribusi", () => {
  it("membatasi anggota biasa pada dirinya sendiri", () => {
    expect(saringanRekapKontribusi(pengguna("ANGGOTA"))).toEqual({ id: "orang-ini" });
  });

  it("membatasi ketua squad pada squadnya", () => {
    expect(saringanRekapKontribusi(pengguna("KETUA_SQUAD"))).toEqual({ squadId: "squad-vtol" });
  });

  it("mengunci ketua squad tanpa squad pada dirinya sendiri", () => {
    expect(saringanRekapKontribusi(pengguna("KETUA_SQUAD", null))).toEqual({ id: "orang-ini" });
  });

  it("membuka seluruh laboratorium untuk Kepala Lab, koordinator, dan pengawas", () => {
    for (const peran of [
      "KEPALA_LAB",
      "KOORD_OPERASIONAL",
      "KOORD_RISET",
      "KOORD_PENGEMBANGAN",
      "PENGAWAS",
    ] as Role[]) {
      expect(saringanRekapKontribusi(pengguna(peran, null)), peran).toEqual({});
    }
  });

  it("tidak pernah mengembalikan saringan kosong untuk anggota biasa", () => {
    // Saringan kosong berarti "semua orang" pada Prisma — kekeliruan yang akan
    // membocorkan skor seluruh laboratorium tanpa satu pun pesan galat.
    for (const squad of ["squad-vtol", null]) {
      expect(saringanRekapKontribusi(pengguna("ANGGOTA", squad))).not.toEqual({});
    }
  });
});
