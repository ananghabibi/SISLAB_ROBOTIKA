import { describe, expect, it } from "vitest";
import type { Role } from "@prisma/client";

import {
  bolehBaca,
  bolehHapus,
  bolehKelolaAkun,
  bolehMemberiPeran,
  bolehMenerbitkanSkk,
  bolehTulis,
  izinUntuk,
  MATRIKS_AKSES,
  MODUL,
  peranDapatDiberi,
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

describe("penyimpangan yang disengaja dari SPEC 4.2", () => {
  // Ketiganya diminta Kepala Laboratorium sendiri. Diuji supaya tidak
  // diam-diam hilang saat matriksnya disusun ulang, dan supaya siapa pun yang
  // membandingkannya dengan SPEC tahu bahwa selisihnya memang disengaja.
  it("KEPALA_LAB dapat mencatat peminjaman, piket, dan logbook", () => {
    for (const modul of ["peminjaman", "piket", "logbook"] as const) {
      expect(izinUntuk("KEPALA_LAB", modul).tulis).toBe("SEMUA");
    }
  });

  it("penyimpangan itu tidak ikut membuka hak hapus", () => {
    // Catatan peminjaman, piket, dan logbook tidak dihapus siapa pun.
    for (const modul of ["peminjaman", "piket", "logbook"] as const) {
      expect(izinUntuk("KEPALA_LAB", modul).hapus).toBe(false);
    }
  });

  it("PENGAWAS tetap tidak tersentuh oleh penyimpangan itu", () => {
    for (const modul of ["peminjaman", "piket", "logbook"] as const) {
      expect(izinUntuk("PENGAWAS", modul).tulis).toBe("TIDAK");
    }
  });

  it("KOORD_PENGEMBANGAN dapat mendaftarkan anggota baru", () => {
    // Diminta Kepala Laboratorium: pendaftaran anggota datang bersamaan dengan
    // pembinaan kaderisasi, dan yang menjalankannya Koordinator Pengembangan.
    expect(izinUntuk("KOORD_PENGEMBANGAN", "master_anggota").tulis).toBe("SEMUA");
  });

  it("hak mendaftarkan anggota tidak ikut membuka pemberian peran maupun hapus", () => {
    // Batas penyimpangannya: memberi peran selain ANGGOTA tetap milik Kepala
    // Laboratorium seorang, dan menghapus anggota pun tidak ikut terbuka.
    expect(izinUntuk("KOORD_PENGEMBANGAN", "peran_hak_akses").tulis).toBe("TIDAK");
    expect(izinUntuk("KOORD_PENGEMBANGAN", "master_anggota").hapus).toBe(false);
    expect(izinUntuk("KOORD_OPERASIONAL", "master_anggota").hapus).toBe(false);
  });
});

describe("pembagian wewenang antar-koordinator (tidak boleh tumpang tindih)", () => {
  const KOORDINATOR: Role[] = ["KOORD_OPERASIONAL", "KOORD_RISET", "KOORD_PENGEMBANGAN"];

  it("tidak ada satu modul pun yang dikelola dua koordinator sekaligus", () => {
    // Yang dibandingkan adalah WEWENANG PENGELOLAAN (tulis "SEMUA" — atas data
    // orang lain), bukan layanan-mandiri: absensi sendiri dan pelaporan insiden
    // berlingkup "SENDIRI" bagi semua orang dan bukan ranah koordinator.
    for (const modul of MODUL) {
      const pengelola = KOORDINATOR.filter((k) => izinUntuk(k, modul).tulis === "SEMUA");
      expect(pengelola.length, `${modul} dikelola ${pengelola.join(", ")}`).toBeLessThanOrEqual(1);
    }
  });

  it("tiap koordinator memegang ranahnya sendiri", () => {
    // Operasional: inventaris & piket. Riset: logbook. Pengembangan: keanggotaan.
    expect(bolehTulis("KOORD_OPERASIONAL", "inventaris")).toBe(true);
    expect(bolehTulis("KOORD_OPERASIONAL", "piket")).toBe(true);
    expect(bolehTulis("KOORD_RISET", "logbook")).toBe(true);
    expect(bolehTulis("KOORD_PENGEMBANGAN", "master_anggota")).toBe(true);
  });

  it("koordinator tidak menulis ranah koordinator lain", () => {
    expect(bolehTulis("KOORD_RISET", "inventaris")).toBe(false);
    expect(bolehTulis("KOORD_RISET", "piket")).toBe(false);
    expect(bolehTulis("KOORD_RISET", "master_anggota")).toBe(false);
    expect(bolehTulis("KOORD_PENGEMBANGAN", "inventaris")).toBe(false);
    expect(bolehTulis("KOORD_PENGEMBANGAN", "piket")).toBe(false);
    expect(bolehTulis("KOORD_PENGEMBANGAN", "logbook")).toBe(false);
    expect(bolehTulis("KOORD_OPERASIONAL", "logbook")).toBe(false);
    expect(bolehTulis("KOORD_OPERASIONAL", "master_anggota")).toBe(false);
  });
});

describe("batas penetapan peran", () => {
  it("Kepala Laboratorium boleh menetapkan peran apa pun", () => {
    expect(bolehMemberiPeran("KEPALA_LAB", "ANGGOTA", "KOORD_RISET")).toBe(true);
    expect(bolehMemberiPeran("KEPALA_LAB", "KOORD_RISET", "ANGGOTA")).toBe(true);
    expect(peranDapatDiberi("KEPALA_LAB")).toContain("KOORD_OPERASIONAL");
  });

  it("Koordinator Pengembangan hanya sampai Ketua Squad", () => {
    expect(bolehMemberiPeran("KOORD_PENGEMBANGAN", null, "ANGGOTA")).toBe(true);
    expect(bolehMemberiPeran("KOORD_PENGEMBANGAN", "ANGGOTA", "KETUA_SQUAD")).toBe(true);
    // Tidak boleh mengangkat menjadi koordinator, kepala lab, atau pengawas.
    expect(bolehMemberiPeran("KOORD_PENGEMBANGAN", "ANGGOTA", "KOORD_RISET")).toBe(false);
    expect(bolehMemberiPeran("KOORD_PENGEMBANGAN", "KETUA_SQUAD", "KEPALA_LAB")).toBe(false);
    expect(bolehMemberiPeran("KOORD_PENGEMBANGAN", "ANGGOTA", "PENGAWAS")).toBe(false);
    // Tidak boleh menyentuh akun yang SUDAH koordinator ke atas, sekalipun
    // menurunkannya menjadi Anggota.
    expect(bolehMemberiPeran("KOORD_PENGEMBANGAN", "KOORD_OPERASIONAL", "ANGGOTA")).toBe(false);
    expect(peranDapatDiberi("KOORD_PENGEMBANGAN")).toEqual(["ANGGOTA", "KETUA_SQUAD"]);
  });

  it("peran tanpa hak keanggotaan tidak dapat menetapkan peran sama sekali", () => {
    expect(bolehMemberiPeran("KOORD_OPERASIONAL", "ANGGOTA", "KETUA_SQUAD")).toBe(false);
    expect(bolehMemberiPeran("KETUA_SQUAD", "ANGGOTA", "ANGGOTA")).toBe(false);
    expect(peranDapatDiberi("KOORD_OPERASIONAL")).toEqual([]);
  });
});

describe("akun Kepala Laboratorium hanya boleh disentuh Kepala Laboratorium", () => {
  it("tidak seorang pun selain Kepala Laboratorium boleh mengelola akun Kepala Lab", () => {
    for (const peran of SEMUA_PERAN) {
      const boleh = bolehKelolaAkun(peran, "KEPALA_LAB");
      expect(boleh, `${peran} atas akun Kepala Lab`).toBe(peran === "KEPALA_LAB");
    }
  });

  it("mengelola akun selain Kepala Lab tidak ikut tertutup oleh aturan ini", () => {
    // Aturan ini khusus melindungi akun Kepala Lab; akun lain tetap tunduk pada
    // hak modul biasa.
    expect(bolehKelolaAkun("KOORD_PENGEMBANGAN", "ANGGOTA")).toBe(true);
    expect(bolehKelolaAkun("KOORD_PENGEMBANGAN", "KETUA_SQUAD")).toBe(true);
    expect(bolehKelolaAkun("KOORD_PENGEMBANGAN", "KOORD_RISET")).toBe(true);
  });
});
