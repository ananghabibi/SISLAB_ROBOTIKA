import { describe, expect, it } from "vitest";

import {
  catatanFakultasLain,
  layakSkk,
  nomorSkk,
  syaratBelumTerpenuhi,
  syaratSkk,
  type MasukanSyarat,
} from "@/lib/skk";

const LULUS: MasukanSyarat = {
  persenHadir: 85,
  entriLogbook: 12,
  pekanAktif: 14,
  piket: 8,
  targetPiket: 8,
  skor: 88,
  ambangLulus: 70,
};

describe("syarat Surat Keterangan Kontribusi (SPEC 6.2)", () => {
  it("menyebut seluruh syarat, bukan hanya yang kurang", () => {
    // Daftar yang hanya memuat kekurangan menyembunyikan seberapa dekat
    // seseorang dengan ambang — justru itu yang perlu dilihat.
    expect(syaratSkk(LULUS)).toHaveLength(4);
    expect(layakSkk(syaratSkk(LULUS))).toBe(true);
  });

  it("menolak kehadiran di bawah 70 persen", () => {
    const syarat = syaratSkk({ ...LULUS, persenHadir: 69.9 });
    expect(layakSkk(syarat)).toBe(false);
    expect(syaratBelumTerpenuhi(syarat).map((s) => s.label)).toEqual(["Kehadiran"]);
  });

  it("menerima kehadiran tepat pada ambang", () => {
    expect(layakSkk(syaratSkk({ ...LULUS, persenHadir: 70 }))).toBe(true);
  });

  it("menghitung logbook sebagai persentase pekan aktif", () => {
    // 9 dari 14 pekan = 64,3 persen, di bawah ambang.
    const kurang = syaratSkk({ ...LULUS, entriLogbook: 9 });
    expect(layakSkk(kurang)).toBe(false);
    expect(syaratBelumTerpenuhi(kurang)[0]!.keterangan).toContain("64.3%");

    // 10 dari 14 = 71,4 persen, lolos.
    expect(layakSkk(syaratSkk({ ...LULUS, entriLogbook: 10 }))).toBe(true);
  });

  it("tidak membagi nol saat periodenya belum berjalan", () => {
    const syarat = syaratSkk({ ...LULUS, entriLogbook: 0, pekanAktif: 0 });
    expect(syarat[1]!.terpenuhi).toBe(false);
    expect(syarat[1]!.keterangan).toContain("belum berjalan");
  });

  it("menganggap piket terpenuhi bila periode tidak menetapkan targetnya", () => {
    // Target nol berarti tidak dinilai, bukan berarti gagal.
    const syarat = syaratSkk({ ...LULUS, piket: 0, targetPiket: 0 });
    expect(syarat[2]!.terpenuhi).toBe(true);
    expect(layakSkk(syarat)).toBe(true);
  });

  it("menolak skor di bawah ambang periode", () => {
    expect(layakSkk(syaratSkk({ ...LULUS, skor: 69, ambangLulus: 70 }))).toBe(false);
  });
});

describe("syarat serah terima dokumentasi", () => {
  it("tidak berlaku bagi yang bukan anggota tim lomba", () => {
    expect(syaratSkk(LULUS).some((s) => s.label === "Serah terima dokumentasi")).toBe(false);
  });

  it("belum dapat dinilai selama belum dikonfirmasi manusia", () => {
    // Tidak ada kejadian di sistem yang dapat membuktikannya.
    const syarat = syaratSkk({ ...LULUS, timLomba: true });
    const dokumentasi = syarat.find((s) => s.label === "Serah terima dokumentasi");
    expect(dokumentasi?.terpenuhi).toBeNull();
    expect(layakSkk(syarat)).toBe(false);
  });

  it("lolos setelah dinyatakan tuntas", () => {
    expect(layakSkk(syaratSkk({ ...LULUS, timLomba: true, dokumentasiTuntas: true }))).toBe(true);
  });

  it("gagal bila dinyatakan belum tuntas", () => {
    expect(layakSkk(syaratSkk({ ...LULUS, timLomba: true, dokumentasiTuntas: false }))).toBe(false);
  });
});

describe("nomor surat", () => {
  it("mengikuti kebiasaan penomoran surat fakultas", () => {
    expect(nomorSkk(7, 9, 2026)).toBe("007/SKK/LAB-ROB/FT-UNISMA/IX/2026");
    expect(nomorSkk(1, 1, 2027)).toBe("001/SKK/LAB-ROB/FT-UNISMA/I/2027");
    expect(nomorSkk(123, 12, 2026)).toBe("123/SKK/LAB-ROB/FT-UNISMA/XII/2026");
  });

  it("tidak memotong nomor yang melewati tiga digit", () => {
    expect(nomorSkk(1001, 3, 2027)).toBe("1001/SKK/LAB-ROB/FT-UNISMA/III/2027");
  });

  it("tidak pernah menghasilkan nomor nol atau negatif", () => {
    expect(nomorSkk(0, 5, 2026)).toBe("001/SKK/LAB-ROB/FT-UNISMA/V/2026");
    expect(nomorSkk(-3, 5, 2026)).toBe("001/SKK/LAB-ROB/FT-UNISMA/V/2026");
  });

  it("menghasilkan nomor yang berbeda untuk urutan yang berbeda", () => {
    const nomor = [1, 2, 3, 4, 5].map((n) => nomorSkk(n, 9, 2026));
    expect(new Set(nomor).size).toBe(5);
  });
});

describe("catatan anggota lintas fakultas (SPEC 6.3)", () => {
  it("tidak menambahkan catatan bagi anggota Fakultas Teknik", () => {
    expect(catatanFakultasLain("Teknik")).toBeNull();
    expect(catatanFakultasLain(" teknik ")).toBeNull();
  });

  it("menyebut fakultas asal dan ketentuan U-Point-nya", () => {
    const catatan = catatanFakultasLain("Peternakan") ?? "";
    expect(catatan).toContain("Peternakan");
    expect(catatan).toContain("U-Point");
  });
});
