// -----------------------------------------------------------------------------
// POST /api/attendance — satu-satunya pintu masuk pencatatan kehadiran.
//
// Ketiga lapis anti titip absen diperiksa BERURUTAN dan semuanya harus lolos:
//
//   Lapis 1  jaringan      — permintaan harus datang dari subnet laboratorium
//   Lapis 3  token QR      — dipindai dari layar lab, umur maksimal 90 detik,
//                            dan nonce-nya belum pernah dipakai orang ini
//   Lapis 2  kode harian   — diketik ulang dari layar sebagai konfirmasi kedua
//
// Lapis 1 diperiksa lebih dulu karena paling murah dan paling menentukan: bila
// permintaannya datang dari luar lab, tidak ada gunanya memeriksa yang lain.
//
// Endpoint ini tidak pernah mengembalikan kode harian, tidak pula memberi
// petunjuk tentang isinya di dalam pesan galat.
// -----------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { absenMasuk, absenPulang, validasiCatatanPulang } from "@/lib/absensi";
import { catatAudit } from "@/lib/audit";
import { periksaJaringan } from "@/lib/jaringan";
import { kodeHarianCocok, PANJANG_KODE } from "@/lib/kode-harian";
import { bersihkanNonceLama, klaimNonce } from "@/lib/nonce";
import { periksaLaju } from "@/lib/pembatas-laju";
import { periksaToken } from "@/lib/token-qr";

/** Batas percobaan absensi. Longgar untuk yang salah ketik, ketat untuk penebak. */
const BATAS_PER_PENGGUNA = 10;
const BATAS_PER_IP = 40;
const JENDELA_DETIK = 300;

const skema = z.object({
  aksi: z.enum(["masuk", "pulang"]),
  token: z.string().min(1),
  kode: z.string().min(1),
  jenisKegiatan: z
    .enum(["RISET", "PIKET", "RAPAT", "PELATIHAN", "PENGABDIAN", "ADMINISTRASI", "LAINNYA"])
    .default("RISET"),
  rencana: z.string().max(500).optional(),
  uraian: z.string().max(2000).optional(),
  kendala: z.string().max(2000).optional(),
  /** Pernyataan tegas bahwa hari itu tidak ada kendala. */
  tanpaKendala: z.boolean().optional(),
});

function tolak(pesan: string, status: number, tambahan?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, pesan, ...tambahan }, { status });
}

export async function POST(permintaan: Request) {
  // ---- Siapa yang meminta -------------------------------------------------
  const sesi = await auth();
  if (!sesi?.user?.id) {
    return tolak("Anda belum masuk. Masuk dulu dengan akun kampus.", 401);
  }
  const pengguna = sesi.user;

  if (pengguna.status !== "AKTIF" && pengguna.status !== "CUTI") {
    return tolak("Status keanggotaan Anda tidak memungkinkan mencatat kehadiran.", 403);
  }

  // ---- Lapis 1: jaringan laboratorium -------------------------------------
  const jaringan = periksaJaringan(permintaan.headers);
  if (!jaringan.diizinkan) {
    // Percobaan dari luar lab dicatat: pola berulang layak diketahui Kepala Lab.
    await catatAudit({
      userId: pengguna.id,
      aksi: "ABSENSI_DITOLAK_JARINGAN",
      entitas: "Attendance",
      ip: jaringan.ip,
      dataBaru: { alasan: jaringan.alasan },
    });
    return tolak(jaringan.alasan ?? "Permintaan ditolak.", 403);
  }
  const ip = jaringan.ip ?? "tidak-diketahui";

  // ---- Pembatas laju ------------------------------------------------------
  const lajuPengguna = periksaLaju(`absensi:u:${pengguna.id}`, BATAS_PER_PENGGUNA, JENDELA_DETIK);
  const lajuIp = periksaLaju(`absensi:ip:${ip}`, BATAS_PER_IP, JENDELA_DETIK);
  const laju = !lajuPengguna.diizinkan ? lajuPengguna : lajuIp;
  if (!laju.diizinkan) {
    return tolak(
      `Terlalu banyak percobaan. Coba lagi dalam ${laju.cobaLagiDetik} detik.`,
      429,
      { cobaLagiDetik: laju.cobaLagiDetik },
    );
  }

  // ---- Bentuk permintaan --------------------------------------------------
  let mentah: unknown;
  try {
    mentah = await permintaan.json();
  } catch {
    return tolak("Isi permintaan bukan JSON yang sah.", 400);
  }

  const terurai = skema.safeParse(mentah);
  if (!terurai.success) {
    return tolak("Data yang dikirim belum lengkap atau tidak sah.", 400);
  }
  const data = terurai.data;

  // ---- Lapis 3: token QR berputar -----------------------------------------
  let hasilToken;
  try {
    hasilToken = periksaToken(data.token);
  } catch (galat) {
    console.error("[absensi] token tidak dapat diperiksa:", galat);
    return tolak("Peladen belum dikonfigurasi untuk memeriksa token QR.", 500);
  }
  if (!hasilToken.sah) return tolak(hasilToken.alasan, 400);

  const nonceBaru = await klaimNonce(hasilToken.isi.nonce, pengguna.id);
  if (!nonceBaru) {
    return tolak(
      "Token QR ini sudah Anda pakai. Pindai QR yang sedang tampil di layar sekarang.",
      409,
    );
  }
  void bersihkanNonceLama();

  // ---- Lapis 2: kode harian -----------------------------------------------
  if (data.kode.replace(/\s+/g, "").length !== PANJANG_KODE) {
    return tolak(`Kode harian terdiri dari ${PANJANG_KODE} karakter.`, 400);
  }
  if (!(await kodeHarianCocok(data.kode))) {
    return tolak("Kode harian salah. Baca ulang kode yang tampil di layar laboratorium.", 400);
  }

  // ---- Catatan wajib saat pulang ------------------------------------------
  // Diperiksa di peladen, bukan hanya lewat atribut `required` di formulir:
  // yang menentukan isi basis data adalah pemeriksaan ini.
  if (data.aksi === "pulang") {
    const galatCatatan = validasiCatatanPulang({
      uraian: data.uraian,
      kendala: data.kendala,
      tanpaKendala: data.tanpaKendala,
    });
    if (galatCatatan) return tolak(galatCatatan, 400);
  }

  // ---- Ketiga lapis lolos: catat ------------------------------------------
  const hasil =
    data.aksi === "masuk"
      ? await absenMasuk({
          userId: pengguna.id,
          ip,
          jenisKegiatan: data.jenisKegiatan,
          rencana: data.rencana,
        })
      : await absenPulang({
          userId: pengguna.id,
          ip,
          uraian: data.uraian,
          // "Tidak ada kendala" disimpan sebagai kosong, bukan sebagai teks
          // basa-basi, supaya kolom ini tetap berarti saat direkap.
          kendala: data.tanpaKendala ? null : data.kendala,
        });

  if (!hasil.ok) {
    return tolak(hasil.pesan, 409, { kode: hasil.kode });
  }

  await catatAudit({
    userId: pengguna.id,
    aksi: data.aksi === "masuk" ? "ABSEN_MASUK" : "ABSEN_PULANG",
    entitas: "Attendance",
    entitasId: hasil.catatan.id,
    ip,
  });

  return NextResponse.json({
    ok: true,
    pesan: hasil.pesan,
    data: {
      id: hasil.catatan.id,
      jamMasuk: hasil.catatan.jamMasuk,
      jamKeluar: hasil.catatan.jamKeluar,
      jenisKegiatan: hasil.catatan.jenisKegiatan,
    },
  });
}

/** Metode selain POST tidak dilayani. */
export async function GET() {
  return tolak("Gunakan POST untuk mencatat kehadiran.", 405);
}
