import { describe, expect, it } from "vitest";

import {
  bacaChecklist,
  butirBelumDicentang,
  butirPiket,
  jadwalPiket,
  persenChecklist,
  squadTerjadwal,
  type ButirPiket,
} from "@/lib/piket";
import { nomorHariWib } from "@/lib/waktu";

const CONTOH: ButirPiket[] = [
  { kode: "MEJA", butir: "Meja bersih", keterangan: "" },
  { kode: "SOLDER", butir: "Solder mati", keterangan: "" },
  { kode: "PINTU", butir: "Pintu dikunci", keterangan: "" },
];

describe("berkas checklist piket", () => {
  it("berisi delapan butir sebagaimana diminta SPEC bagian 7", () => {
    expect(butirPiket()).toHaveLength(8);
  });

  it("memakai kode yang unik, karena kode itulah kunci di basis data", () => {
    const kode = butirPiket().map((b) => b.kode);
    expect(new Set(kode).size).toBe(kode.length);
  });

  it("mengisi kalimat butir untuk setiap baris", () => {
    for (const b of butirPiket()) {
      expect(b.kode).not.toBe("");
      expect(b.butir).not.toBe("");
    }
  });

  it("menutup dengan butir mengunci pintu", () => {
    // Urutan berarti: butir terakhir dikerjakan paling akhir.
    expect(butirPiket().at(-1)?.kode).toBe("PINTU");
  });
});

describe("jadwal piket", () => {
  it("menjadwalkan lima hari kerja, satu squad tiap hari", () => {
    const jadwal = jadwalPiket();
    expect(jadwal).toHaveLength(5);
    expect(jadwal.map((j) => j.nomorHari)).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(jadwal.map((j) => j.kodeSquad)).size).toBe(5);
  });

  it("menemukan squad yang terjadwal pada hari kerja", () => {
    const jadwal = jadwalPiket();
    expect(squadTerjadwal(jadwal, 1)?.kodeSquad).toBe("VTOL");
    expect(squadTerjadwal(jadwal, 5)?.hari).toBe("Jumat");
  });

  it("mengembalikan null pada Sabtu dan Minggu, bukan menuduhnya terlewat", () => {
    const jadwal = jadwalPiket();
    expect(squadTerjadwal(jadwal, 6)).toBeNull();
    expect(squadTerjadwal(jadwal, 0)).toBeNull();
  });

  it("cocok dengan nomor hari WIB, bukan nomor hari UTC", () => {
    // Senin 1 Juni 2026 pukul 06.00 WIB = Minggu 23.00 UTC. Tanpa penyesuaian
    // WIB, piket Senin pagi akan dicari pada jadwal hari Minggu yang kosong.
    const seninPagiWib = new Date("2026-06-01T06:00:00+07:00");
    expect(seninPagiWib.getUTCDay()).toBe(0);
    expect(nomorHariWib(seninPagiWib)).toBe(1);
    expect(squadTerjadwal(jadwalPiket(), nomorHariWib(seninPagiWib))?.kodeSquad).toBe("VTOL");
  });
});

describe("pembacaan checklist tersimpan", () => {
  it("membaca centang yang ada dan menganggap sisanya belum dikerjakan", () => {
    const jawaban = bacaChecklist({ MEJA: true, SOLDER: false }, CONTOH);
    expect(jawaban).toEqual({ MEJA: true, SOLDER: false, PINTU: false });
  });

  it("membuang kode yang sudah tidak ada lagi di berkas CSV", () => {
    // Butir yang dihapus pengurus tidak boleh muncul kembali dari catatan lama.
    const jawaban = bacaChecklist({ MEJA: true, BUTIR_LAMA: true }, CONTOH);
    expect(Object.keys(jawaban)).toEqual(["MEJA", "SOLDER", "PINTU"]);
  });

  it("tidak pecah pada nilai yang bukan objek", () => {
    expect(bacaChecklist(null, CONTOH).MEJA).toBe(false);
    expect(bacaChecklist("bukan objek", CONTOH).MEJA).toBe(false);
  });

  it("hanya menerima true sebagai tercentang", () => {
    // "true" berupa teks, 1, dan "ya" datang dari formulir yang salah susun.
    const jawaban = bacaChecklist({ MEJA: "true", SOLDER: 1, PINTU: "ya" }, CONTOH);
    expect(jawaban).toEqual({ MEJA: false, SOLDER: false, PINTU: false });
  });
});

describe("ringkasan checklist", () => {
  it("menyebutkan butir yang belum dikerjakan", () => {
    const jawaban = bacaChecklist({ MEJA: true }, CONTOH);
    expect(butirBelumDicentang(CONTOH, jawaban).map((b) => b.kode)).toEqual(["SOLDER", "PINTU"]);
  });

  it("menghitung persentase yang tercentang", () => {
    expect(persenChecklist(CONTOH, bacaChecklist({}, CONTOH))).toBe(0);
    expect(persenChecklist(CONTOH, bacaChecklist({ MEJA: true }, CONTOH))).toBe(33);
    expect(
      persenChecklist(CONTOH, bacaChecklist({ MEJA: true, SOLDER: true, PINTU: true }, CONTOH)),
    ).toBe(100);
  });

  it("tidak membagi nol saat daftar butirnya kosong", () => {
    expect(persenChecklist([], {})).toBe(0);
  });
});
