// -----------------------------------------------------------------------------
// Uji mesin skor kontribusi.
//
// SPEC bagian 6.1 mewajibkan uji untuk empat keadaan: skor sempurna, skor nol,
// pengurangan alat belum kembali yang membuat hasil negatif, dan target
// bernilai nol. Keempatnya ada di bawah, beserta satu berkas hitungan manual
// supaya angkanya dapat dicocokkan dengan kalkulator tangan.
// -----------------------------------------------------------------------------

import { describe, expect, it } from "vitest";

import {
  daftarKekurangan,
  hitungSkor,
  rasioPencapaian,
  type KomponenKontribusi,
  type TargetPeriode,
} from "@/lib/skor";

/** Target periode contoh, sama dengan yang dipakai seeder. */
const TARGET: TargetPeriode = {
  targetHadir: 48,
  targetSesiBerbagi: 2,
  targetPiket: 8,
  targetLogbook: 12,
  ambangLulus: 70,
};

const NOL: KomponenKontribusi = {
  hariHadir: 0,
  sesiBerbagi: 0,
  piket: 0,
  entriLogbook: 0,
  alatBelumKembali: 0,
};

describe("rasio pencapaian", () => {
  it("dibatasi pada 1 walau melampaui target", () => {
    expect(rasioPencapaian(96, 48)).toBe(1);
    expect(rasioPencapaian(48, 48)).toBe(1);
    expect(rasioPencapaian(24, 48)).toBe(0.5);
  });

  it("menganggap target nol sebagai tidak disyaratkan, bukan pembagian nol", () => {
    // Menghukum anggota karena pengurus lupa mengisi target jelas keliru,
    // dan membiarkan NaN merambat ke Surat Keterangan Kontribusi lebih buruk.
    expect(rasioPencapaian(0, 0)).toBe(1);
    expect(rasioPencapaian(5, 0)).toBe(1);
    expect(Number.isNaN(rasioPencapaian(0, 0))).toBe(false);
  });

  it("tahan terhadap angka yang tidak masuk akal", () => {
    expect(rasioPencapaian(-5, 48)).toBe(0);
    expect(rasioPencapaian(Number.NaN, 48)).toBe(0);
    expect(rasioPencapaian(10, Number.NaN)).toBe(1);
    expect(rasioPencapaian(10, -3)).toBe(1);
  });
});

describe("skor sempurna", () => {
  it("memberi 100 saat seluruh target terpenuhi", () => {
    const hasil = hitungSkor(
      { hariHadir: 48, sesiBerbagi: 2, piket: 8, entriLogbook: 12, alatBelumKembali: 0 },
      TARGET,
    );
    expect(hasil.skor).toBe(100);
    expect(hasil.lulus).toBe(true);
    expect(hasil.nilaiHadir).toBe(40);
    expect(hasil.nilaiSesiBerbagi).toBe(20);
    expect(hasil.nilaiPiket).toBe(20);
    expect(hasil.nilaiLogbook).toBe(20);
  });

  it("tetap 100 walau seluruh capaian melampaui target", () => {
    const hasil = hitungSkor(
      { hariHadir: 200, sesiBerbagi: 9, piket: 30, entriLogbook: 40, alatBelumKembali: 0 },
      TARGET,
    );
    expect(hasil.skor).toBe(100);
  });
});

describe("skor nol", () => {
  it("memberi 0 saat tidak ada capaian sama sekali", () => {
    const hasil = hitungSkor(NOL, TARGET);
    expect(hasil.skor).toBe(0);
    expect(hasil.lulus).toBe(false);
  });
});

describe("pengurangan alat belum kembali", () => {
  it("memotong 5 poin untuk setiap alat", () => {
    const hasil = hitungSkor(
      { hariHadir: 48, sesiBerbagi: 2, piket: 8, entriLogbook: 12, alatBelumKembali: 3 },
      TARGET,
    );
    expect(hasil.penguranganAlat).toBe(-15);
    expect(hasil.skor).toBe(85);
  });

  it("tidak pernah menghasilkan skor negatif", () => {
    // 40 poin kehadiran dipotong 100 poin alat = -60 sebelum dibatasi.
    const hasil = hitungSkor(
      { hariHadir: 48, sesiBerbagi: 0, piket: 0, entriLogbook: 0, alatBelumKembali: 20 },
      TARGET,
    );
    expect(hasil.sebelumDibatasi).toBe(-60);
    expect(hasil.skor).toBe(0);
    expect(hasil.lulus).toBe(false);
  });

  it("mengabaikan jumlah alat yang tidak masuk akal", () => {
    const hasil = hitungSkor({ ...NOL, hariHadir: 48, alatBelumKembali: -4 }, TARGET);
    expect(hasil.penguranganAlat).toBe(-0);
    expect(hasil.skor).toBe(40);
  });
});

describe("target bernilai nol", () => {
  const TANPA_TARGET: TargetPeriode = {
    targetHadir: 0,
    targetSesiBerbagi: 0,
    targetPiket: 0,
    targetLogbook: 0,
    ambangLulus: 70,
  };

  it("tidak menghasilkan NaN maupun Infinity", () => {
    const hasil = hitungSkor(NOL, TANPA_TARGET);
    expect(Number.isFinite(hasil.skor)).toBe(true);
    expect(hasil.skor).toBe(100);
  });

  it("hanya melumpuhkan komponen yang targetnya nol", () => {
    const hasil = hitungSkor(NOL, { ...TARGET, targetPiket: 0 });
    // Piket dianggap terpenuhi (20), sisanya nol.
    expect(hasil.nilaiPiket).toBe(20);
    expect(hasil.skor).toBe(20);
  });
});

describe("kecocokan dengan hitungan manual", () => {
  it("anggota yang hadir separuh target dan mengisi separuh logbook", () => {
    // 40×(24/48) + 20×(1/2) + 20×(4/8) + 20×(6/12) − 5×0
    // = 20 + 10 + 10 + 10 = 50
    const hasil = hitungSkor(
      { hariHadir: 24, sesiBerbagi: 1, piket: 4, entriLogbook: 6, alatBelumKembali: 0 },
      TARGET,
    );
    expect(hasil.skor).toBe(50);
    expect(hasil.lulus).toBe(false);
  });

  it("anggota tepat di ambang kelulusan", () => {
    // 40×(48/48) + 20×(2/2) + 20×(4/8) + 20×(0/12) − 5×0
    // = 40 + 20 + 10 + 0 = 70
    const hasil = hitungSkor(
      { hariHadir: 48, sesiBerbagi: 2, piket: 4, entriLogbook: 0, alatBelumKembali: 0 },
      TARGET,
    );
    expect(hasil.skor).toBe(70);
    expect(hasil.lulus).toBe(true);
  });

  it("satu alat belum kembali menjatuhkan yang tepat di ambang", () => {
    const hasil = hitungSkor(
      { hariHadir: 48, sesiBerbagi: 2, piket: 4, entriLogbook: 0, alatBelumKembali: 1 },
      TARGET,
    );
    expect(hasil.skor).toBe(65);
    expect(hasil.lulus).toBe(false);
  });

  it("menghormati ambang lulus yang diubah per periode", () => {
    const komponen = { hariHadir: 24, sesiBerbagi: 1, piket: 4, entriLogbook: 6, alatBelumKembali: 0 };
    expect(hitungSkor(komponen, { ...TARGET, ambangLulus: 50 }).lulus).toBe(true);
    expect(hitungSkor(komponen, { ...TARGET, ambangLulus: 51 }).lulus).toBe(false);
  });
});

describe("daftar kekurangan untuk dasbor anggota", () => {
  it("menyebutkan berapa lagi yang perlu dikumpulkan", () => {
    const kurang = daftarKekurangan(
      { hariHadir: 24, sesiBerbagi: 2, piket: 4, entriLogbook: 12, alatBelumKembali: 0 },
      TARGET,
    );
    expect(kurang.map((k) => k.label)).toEqual(["Kehadiran", "Piket"]);
    expect(kurang[0]).toMatchObject({ kurang: 24, satuan: "hari" });
    expect(kurang[1]).toMatchObject({ kurang: 4, satuan: "kali" });
  });

  it("kosong saat seluruh target terpenuhi", () => {
    expect(
      daftarKekurangan(
        { hariHadir: 48, sesiBerbagi: 2, piket: 8, entriLogbook: 12, alatBelumKembali: 0 },
        TARGET,
      ),
    ).toEqual([]);
  });

  it("tidak menampilkan komponen yang targetnya nol", () => {
    expect(daftarKekurangan(NOL, { ...TARGET, targetHadir: 0 }).map((k) => k.label)).not.toContain(
      "Kehadiran",
    );
  });
});
