import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ipDalamCidr, ipDariHeader, normalkanIp, periksaJaringan } from "@/lib/jaringan";

const lingkunganAsli = { ...process.env };

beforeEach(() => {
  process.env.LAB_SUBNETS = "192.168.1.0/24";
  process.env.LAB_NETWORK_BYPASS = "false";
  vi.stubEnv("NODE_ENV", "test");
});

afterEach(() => {
  vi.unstubAllEnvs();
  process.env = { ...lingkunganAsli };
});

function header(nilai: Record<string, string>): Headers {
  return new Headers(nilai);
}

describe("penyeragaman alamat IP", () => {
  it("membuka bentuk IPv4 terpeta IPv6", () => {
    // Tanpa ini, seluruh laboratorium tertolak di sebagian penyetelan Node.
    expect(normalkanIp("::ffff:192.168.1.5")).toBe("192.168.1.5");
    expect(normalkanIp("::FFFF:192.168.1.5")).toBe("192.168.1.5");
  });

  it("membuang kurung siku pada bentuk beralamat porta", () => {
    expect(normalkanIp("[::1]:52344")).toBe("::1");
  });
});

describe("pencocokan CIDR", () => {
  it("menerima alamat di dalam blok", () => {
    expect(ipDalamCidr("192.168.1.1", "192.168.1.0/24")).toBe(true);
    expect(ipDalamCidr("192.168.1.254", "192.168.1.0/24")).toBe(true);
    expect(ipDalamCidr("::ffff:192.168.1.77", "192.168.1.0/24")).toBe(true);
  });

  it("menolak alamat di luar blok", () => {
    expect(ipDalamCidr("192.168.2.1", "192.168.1.0/24")).toBe(false);
    expect(ipDalamCidr("10.0.0.1", "192.168.1.0/24")).toBe(false);
  });

  it("menangani panjang topeng selain /24", () => {
    expect(ipDalamCidr("10.5.3.9", "10.0.0.0/8")).toBe(true);
    expect(ipDalamCidr("11.5.3.9", "10.0.0.0/8")).toBe(false);
    expect(ipDalamCidr("192.168.1.130", "192.168.1.128/25")).toBe(true);
    expect(ipDalamCidr("192.168.1.127", "192.168.1.128/25")).toBe(false);
    expect(ipDalamCidr("192.168.1.7", "192.168.1.7")).toBe(true);
    expect(ipDalamCidr("192.168.1.8", "192.168.1.7")).toBe(false);
  });

  it("menolak masukan yang tidak masuk akal alih-alih menerimanya", () => {
    expect(ipDalamCidr("bukan-ip", "192.168.1.0/24")).toBe(false);
    expect(ipDalamCidr("192.168.1.1", "bukan-cidr")).toBe(false);
    expect(ipDalamCidr("192.168.1.1", "192.168.1.0/33")).toBe(false);
    expect(ipDalamCidr("300.1.1.1", "300.1.1.0/24")).toBe(false);
  });
});

describe("pembacaan IP asli di belakang Caddy", () => {
  it("mengambil entri pertama X-Forwarded-For", () => {
    // Entri sesudahnya bisa dikarang pemohon dan tidak pernah dipercaya.
    expect(ipDariHeader(header({ "x-forwarded-for": "192.168.1.9, 10.0.0.1" }))).toBe("192.168.1.9");
  });

  it("jatuh ke X-Real-IP bila perlu", () => {
    expect(ipDariHeader(header({ "x-real-ip": "192.168.1.9" }))).toBe("192.168.1.9");
  });

  it("mengembalikan null bila tidak ada keduanya", () => {
    expect(ipDariHeader(header({}))).toBeNull();
  });
});

describe("lapis 1 anti titip absen", () => {
  it("mengizinkan permintaan dari dalam subnet laboratorium", () => {
    const hasil = periksaJaringan(header({ "x-forwarded-for": "192.168.1.20" }));
    expect(hasil.diizinkan).toBe(true);
    expect(hasil.ip).toBe("192.168.1.20");
  });

  it("menolak permintaan dari luar jaringan laboratorium", () => {
    const hasil = periksaJaringan(header({ "x-forwarded-for": "114.79.1.20" }));
    expect(hasil.diizinkan).toBe(false);
    expect(hasil.alasan).toContain("jaringan WiFi laboratorium");
  });

  it("menolak bila LAB_SUBNETS belum diisi — gagal tertutup, bukan terbuka", () => {
    process.env.LAB_SUBNETS = "";
    expect(periksaJaringan(header({ "x-forwarded-for": "192.168.1.20" })).diizinkan).toBe(false);
  });

  it("menolak bila alamat pemohon tidak terbaca sama sekali", () => {
    expect(periksaJaringan(header({})).diizinkan).toBe(false);
  });

  it("mendukung beberapa subnet sekaligus", () => {
    process.env.LAB_SUBNETS = "192.168.1.0/24, 10.10.0.0/16";
    expect(periksaJaringan(header({ "x-forwarded-for": "10.10.5.5" })).diizinkan).toBe(true);
    expect(periksaJaringan(header({ "x-forwarded-for": "10.11.5.5" })).diizinkan).toBe(false);
  });

  it("mengabaikan bypass pengembangan saat NODE_ENV produksi", () => {
    process.env.LAB_NETWORK_BYPASS = "true";
      vi.stubEnv("NODE_ENV", "production");
    // Satu baris yang tertinggal di .env laboratorium tidak boleh mematikan lapis ini.
    expect(periksaJaringan(header({ "x-forwarded-for": "114.79.1.20" })).diizinkan).toBe(false);
  });

  it("menghormati bypass hanya di luar produksi", () => {
    process.env.LAB_NETWORK_BYPASS = "true";
      vi.stubEnv("NODE_ENV", "development");
    expect(periksaJaringan(header({ "x-forwarded-for": "114.79.1.20" })).diizinkan).toBe(true);
  });
});
