// -----------------------------------------------------------------------------
// Uji terhadap berkas data awal itu sendiri.
//
// `data/seed-data.csv` dirawat manusia dan akan disunting setiap awal periode.
// Uji ini menangkap salah ketik sebelum seeder menyentuh basis data — jauh lebih
// murah daripada menemukannya setelah 39 baris masuk dengan squad yang keliru.
// -----------------------------------------------------------------------------

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { uraiCsv } from "@/lib/csv";
import { angkatanDariNpm, jenjangDariAngkatan, npmValid, prodiDariNpm } from "@/lib/npm";

const akar = path.resolve(__dirname, "..");
const anggota = uraiCsv(readFileSync(path.join(akar, "data/seed-data.csv"), "utf8"));
const squad = uraiCsv(readFileSync(path.join(akar, "data/squad-data.csv"), "utf8"));

describe("data awal keanggotaan", () => {
  it("berisi 39 orang: 38 mahasiswa dan 1 dosen", () => {
    expect(anggota).toHaveLength(39);
    expect(anggota.filter((a) => a.npm)).toHaveLength(38);
  });

  it("berisi 6 squad, semuanya punya ketua", () => {
    expect(squad).toHaveLength(6);
    for (const s of squad) expect(s.npm_ketua, s.kode).toBeTruthy();
  });

  it("mengikuti pembagian peran pada SPEC bagian 4.1", () => {
    const hitung = (peran: string) => anggota.filter((a) => a.role === peran).length;
    expect(hitung("KEPALA_LAB")).toBe(1);
    expect(hitung("KOORD_OPERASIONAL")).toBe(1);
    expect(hitung("KOORD_RISET")).toBe(1);
    expect(hitung("KOORD_PENGEMBANGAN")).toBe(1);
    expect(hitung("KETUA_SQUAD")).toBe(6);
    expect(hitung("ANGGOTA")).toBe(29);
  });

  it("tidak memuat NPM atau surel ganda", () => {
    const npm = anggota.map((a) => a.npm).filter(Boolean);
    const email = anggota.map((a) => a.email!.toLowerCase());
    expect(new Set(npm).size).toBe(npm.length);
    expect(new Set(email).size).toBe(email.length);
  });

  it("memakai NPM 11 digit dengan kode prodi yang dikenal", () => {
    for (const a of anggota) {
      if (!a.npm) continue;
      expect(npmValid(a.npm), `${a.nama} (${a.npm})`).toBe(true);
      expect(prodiDariNpm(a.npm), `${a.nama} (${a.npm})`).not.toBeNull();
    }
  });

  it("hanya memakai kode squad yang ada di squad-data.csv", () => {
    const kode = new Set(squad.map((s) => s.kode));
    for (const a of anggota) {
      if (a.squad_kode) expect(kode, a.nama).toContain(a.squad_kode);
    }
  });

  it("menempatkan setiap ketua squad di dalam squad yang dipimpinnya", () => {
    for (const s of squad) {
      const ketua = anggota.find((a) => a.npm === s.npm_ketua);
      expect(ketua, `ketua ${s.kode}`).toBeDefined();
      expect(ketua!.squad_kode, ketua!.nama).toBe(s.kode);
      expect(ketua!.role, ketua!.nama).toBe("KETUA_SQUAD");
    }
  });

  it("menempatkan koordinator dan Kepala Lab di luar squad mana pun", () => {
    const koordinator = anggota.filter((a) => a.role!.startsWith("KOORD_") || a.role === "KEPALA_LAB");
    expect(koordinator).toHaveLength(4);
    for (const k of koordinator) expect(k.squad_kode, k.nama).toBe("");
  });

  it("menandai tepat tiga anggota afiliasi dari luar Fakultas Teknik", () => {
    const luar = anggota.filter((a) => {
      if (!a.npm) return false;
      const t = a.fakultas || prodiDariNpm(a.npm)?.fakultas;
      return t !== "Teknik";
    });
    expect(luar.map((a) => a.nama).sort()).toEqual([
      "Difa Cantika Mayzahra",
      "Nabiilah Rifda Harmono",
      "Nazaretha Dimitri",
    ]);
  });

  it("menghasilkan jenjang yang benar untuk seluruh mahasiswa", () => {
    const hitung: Record<string, number> = {};
    for (const a of anggota) {
      if (!a.npm) continue;
      const jenjang = a.jenjang || jenjangDariAngkatan(angkatanDariNpm(a.npm));
      hitung[jenjang] = (hitung[jenjang] ?? 0) + 1;
    }
    // 3 koordinator ditandai KOORDINATOR; sisanya mengikuti angkatan.
    expect(hitung).toEqual({ KOORDINATOR: 3, MUDA: 20, MADYA: 12, UTAMA: 3 });
  });
});
