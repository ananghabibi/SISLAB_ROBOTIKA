"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { catatAudit } from "@/lib/audit";
import { npmValid, prodiDariNpm, angkatanDariNpm, jenjangDariAngkatan } from "@/lib/npm";
import { wajibIzin } from "@/lib/penjaga";
import { prisma } from "@/lib/prisma";
import { bolehTulis } from "@/lib/rbac";
import { sandiBawaan } from "@/lib/sandi";

export interface KeadaanAnggota {
  galat?: string;
  berhasil?: string;
  /**
   * Nilai yang benar-benar tersimpan, dikembalikan supaya formulir dapat
   * menampilkan keadaan basis data setelah menyimpan.
   *
   * React 19 mengosongkan ulang medan formulir tak terkendali begitu aksinya
   * selesai — ia memulihkannya ke defaultValue, yaitu nilai LAMA saat formulir
   * pertama dipasang. Akibatnya peran yang baru diubah tampak kembali seperti
   * semula, padahal basis datanya sudah berubah. Nilai ini menjadi defaultValue
   * yang baru, dan `token` memaksa medannya dipasang ulang tiap kali menyimpan.
   */
  tersimpan?: NilaiTersimpan;
  token?: number;
}

export interface NilaiTersimpan {
  nama: string;
  npm: string;
  email: string;
  prodi: string;
  fakultas: string;
  angkatan: string;
  semester: string;
  squadId: string;
  jenjang: string;
  status: string;
  role: string;
}

function nilaiDari(baris: {
  nama: string;
  npm: string | null;
  email: string;
  prodi: string;
  fakultas: string;
  angkatan: number | null;
  semester: number | null;
  squadId: string | null;
  jenjang: string;
  status: string;
  role: string;
}): NilaiTersimpan {
  return {
    nama: baris.nama,
    npm: baris.npm ?? "",
    email: baris.email,
    prodi: baris.prodi,
    fakultas: baris.fakultas,
    angkatan: baris.angkatan?.toString() ?? "",
    semester: baris.semester?.toString() ?? "",
    squadId: baris.squadId ?? "",
    jenjang: baris.jenjang,
    status: baris.status,
    role: baris.role,
  };
}

const PERAN = [
  "KEPALA_LAB",
  "KOORD_OPERASIONAL",
  "KOORD_RISET",
  "KOORD_PENGEMBANGAN",
  "KETUA_SQUAD",
  "ANGGOTA",
  "PENGAWAS",
] as const;
const JENJANG = ["MUDA", "MADYA", "UTAMA", "KOORDINATOR", "KEPALA_LAB"] as const;
const STATUS = ["AKTIF", "CUTI", "NONAKTIF", "LULUS"] as const;

const skemaAnggota = z.object({
  nama: z.string().trim().min(3, "Nama minimal 3 karakter."),
  npm: z
    .string()
    .trim()
    .refine((v) => v === "" || npmValid(v), "NPM harus 11 digit angka."),
  email: z.string().trim().toLowerCase().email("Surel tidak sah."),
  prodi: z.string().trim().min(2, "Program studi wajib diisi."),
  fakultas: z.string().trim().min(2, "Fakultas wajib diisi."),
  angkatan: z.coerce.number().int().min(2000).max(2099).nullable().catch(null),
  semester: z.coerce.number().int().min(1).max(20).nullable().catch(null),
  squadId: z.string().trim(),
  jenjang: z.enum(JENJANG),
  status: z.enum(STATUS),
  role: z.enum(PERAN),
});

function bacaFormulir(data: FormData) {
  const angka = (k: string) => {
    const v = String(data.get(k) ?? "").trim();
    return v === "" ? null : v;
  };
  return skemaAnggota.safeParse({
    nama: String(data.get("nama") ?? ""),
    npm: String(data.get("npm") ?? ""),
    email: String(data.get("email") ?? ""),
    prodi: String(data.get("prodi") ?? ""),
    fakultas: String(data.get("fakultas") ?? ""),
    angkatan: angka("angkatan"),
    semester: angka("semester"),
    squadId: String(data.get("squadId") ?? ""),
    jenjang: String(data.get("jenjang") ?? "MUDA"),
    status: String(data.get("status") ?? "AKTIF"),
    role: String(data.get("role") ?? "ANGGOTA"),
  });
}

/** Kepala Laboratorium tidak boleh nol. Tanpa penjagaan ini sistem bisa terkunci. */
async function tersisaKepalaLab(kecualiId?: string): Promise<number> {
  return prisma.user.count({
    where: { role: "KEPALA_LAB", status: { in: ["AKTIF", "CUTI"] }, id: { not: kecualiId } },
  });
}

export async function simpanAnggota(
  idAnggota: string,
  _keadaan: KeadaanAnggota,
  data: FormData,
): Promise<KeadaanAnggota> {
  const { pengguna } = await wajibIzin("master_anggota", "tulis");

  const terurai = bacaFormulir(data);
  if (!terurai.success) return { galat: terurai.error.issues[0]!.message };
  const masukan = terurai.data;

  const lama = await prisma.user.findUnique({ where: { id: idAnggota } });
  if (!lama) return { galat: "Anggota tidak ditemukan." };

  // Mengubah peran adalah modul tersendiri: hanya Kepala Laboratorium.
  const peranBerubah = masukan.role !== lama.role;
  if (peranBerubah && !bolehTulis(pengguna.role, "peran_hak_akses")) {
    return { galat: "Hanya Kepala Laboratorium yang dapat mengubah peran." };
  }
  if (peranBerubah && idAnggota === pengguna.id) {
    return {
      galat:
        "Anda tidak dapat mengubah peran diri sendiri. Minta Kepala Laboratorium lain melakukannya.",
    };
  }
  const kehilanganKepalaLab =
    lama.role === "KEPALA_LAB" &&
    (masukan.role !== "KEPALA_LAB" || masukan.status === "NONAKTIF" || masukan.status === "LULUS");
  if (kehilanganKepalaLab && (await tersisaKepalaLab(idAnggota)) === 0) {
    return {
      galat:
        "Ini satu-satunya Kepala Laboratorium yang aktif. Tetapkan penggantinya lebih dulu sebelum mengubah yang ini.",
    };
  }

  const npm = masukan.npm || null;
  if (npm && npm !== lama.npm) {
    const bentrok = await prisma.user.findUnique({ where: { npm } });
    if (bentrok) return { galat: `NPM ${npm} sudah dipakai ${bentrok.nama}.` };
  }
  if (masukan.email !== lama.email) {
    const bentrok = await prisma.user.findUnique({ where: { email: masukan.email } });
    if (bentrok) return { galat: `Surel ${masukan.email} sudah dipakai ${bentrok.nama}.` };
  }

  const baru = await prisma.user.update({
    where: { id: idAnggota },
    data: {
      nama: masukan.nama,
      npm,
      email: masukan.email,
      prodi: masukan.prodi,
      fakultas: masukan.fakultas,
      angkatan: masukan.angkatan,
      semester: masukan.semester,
      squadId: masukan.squadId || null,
      jenjang: masukan.jenjang,
      status: masukan.status,
      role: masukan.role,
    },
  });

  await catatAudit({
    userId: pengguna.id,
    aksi: peranBerubah ? "UBAH_PERAN_ANGGOTA" : "UBAH_ANGGOTA",
    entitas: "User",
    entitasId: idAnggota,
    dataLama: { ...lama, passwordHash: undefined },
    dataBaru: { ...baru, passwordHash: undefined },
  });

  revalidatePath("/anggota");
  revalidatePath(`/anggota/${idAnggota}`);
  return { berhasil: "Perubahan tersimpan.", tersimpan: nilaiDari(baru), token: Date.now() };
}

export async function buatAnggota(
  _keadaan: KeadaanAnggota,
  data: FormData,
): Promise<KeadaanAnggota> {
  const { pengguna } = await wajibIzin("master_anggota", "tulis");

  const terurai = bacaFormulir(data);
  if (!terurai.success) return { galat: terurai.error.issues[0]!.message };
  const masukan = terurai.data;

  if (masukan.role !== "ANGGOTA" && !bolehTulis(pengguna.role, "peran_hak_akses")) {
    return { galat: "Hanya Kepala Laboratorium yang dapat memberi peran selain Anggota." };
  }

  const npm = masukan.npm || null;
  if (npm && (await prisma.user.findUnique({ where: { npm } }))) {
    return { galat: `NPM ${npm} sudah terdaftar.` };
  }
  if (await prisma.user.findUnique({ where: { email: masukan.email } })) {
    return { galat: `Surel ${masukan.email} sudah terdaftar.` };
  }

  // Nilai yang dikosongkan diturunkan dari NPM, seperti pada seeder.
  const turunan = npm ? prodiDariNpm(npm) : null;
  const angkatan = masukan.angkatan ?? (npm ? angkatanDariNpm(npm) : null);

  // Akun lahir langsung dengan kata sandi bawaan, sehingga menambah anggota
  // benar-benar selesai di halaman ini. Benderanya menyala: sampai sandinya
  // diganti sendiri, akun ini hanya membuka Dasbor dan Profil.
  const baru = await prisma.user.create({
    data: {
      nama: masukan.nama,
      npm,
      email: masukan.email,
      prodi: masukan.prodi || turunan?.prodi || "Belum diisi",
      fakultas: masukan.fakultas || turunan?.fakultas || "Teknik",
      angkatan,
      semester: masukan.semester,
      squadId: masukan.squadId || null,
      jenjang: masukan.jenjang ?? jenjangDariAngkatan(angkatan),
      status: masukan.status,
      role: masukan.role,
      passwordHash: await bcrypt.hash(sandiBawaan(), 12),
      wajibGantiSandi: true,
    },
  });

  await catatAudit({
    userId: pengguna.id,
    aksi: "TAMBAH_ANGGOTA",
    entitas: "User",
    entitasId: baru.id,
    dataBaru: { ...baru, passwordHash: undefined },
  });

  revalidatePath("/anggota");
  redirect(`/anggota/${baru.id}`);
}

/**
 * Mengembalikan sebuah akun ke kata sandi bawaan.
 *
 * Jalur pemulihan untuk anggota yang lupa sandinya. Sebelum ini satu-satunya
 * caranya adalah `npm run sandi` di mesin peladen, yang berarti hanya orang
 * dengan akses shell yang dapat menolong — dan orang itu tidak selalu ada di
 * laboratorium saat dibutuhkan.
 *
 * Aman diberikan kepada pengelola master anggota karena kata sandi bawaan
 * tidak membuka apa pun: benderanya ikut menyala kembali, sehingga akunnya
 * hanya dapat dipakai untuk memilih kata sandi baru.
 */
export async function setelUlangSandi(
  idAnggota: string,
  _keadaan: KeadaanAnggota,
  _data: FormData,
): Promise<KeadaanAnggota> {
  const { pengguna } = await wajibIzin("master_anggota", "tulis");

  const anggota = await prisma.user.findUnique({
    where: { id: idAnggota },
    select: { id: true, nama: true },
  });
  if (!anggota) return { galat: "Anggota tidak ditemukan." };

  await prisma.user.update({
    where: { id: idAnggota },
    data: { passwordHash: await bcrypt.hash(sandiBawaan(), 12), wajibGantiSandi: true },
  });

  // Isi kata sandi tidak pernah masuk audit log; hanya faktanya yang dicatat.
  await catatAudit({
    userId: pengguna.id,
    aksi: "SETEL_ULANG_KATA_SANDI",
    entitas: "User",
    entitasId: idAnggota,
  });

  revalidatePath(`/anggota/${idAnggota}`);
  return { berhasil: `Kata sandi ${anggota.nama} dikembalikan ke kata sandi bawaan.` };
}

/**
 * Penghapusan hanya untuk baris yang salah masuk dan belum punya jejak apa pun.
 * Anggota yang sudah pernah beraktivitas TIDAK dihapus — statusnya diubah
 * menjadi LULUS atau NONAKTIF, supaya catatan absensinya tetap utuh.
 */
export async function hapusAnggota(idAnggota: string): Promise<KeadaanAnggota> {
  const { pengguna } = await wajibIzin("master_anggota", "hapus");

  const anggota = await prisma.user.findUnique({
    where: { id: idAnggota },
    include: {
      _count: {
        select: {
          attendances: true,
          pinjamanSebagaiPeminjam: true,
          logbooks: true,
          piketLogs: true,
          insidenDilaporkan: true,
          skkDimiliki: true,
        },
      },
    },
  });
  if (!anggota) return { galat: "Anggota tidak ditemukan." };

  const jejak = Object.values(anggota._count).reduce((a, b) => a + b, 0);
  if (jejak > 0) {
    return {
      galat:
        "Anggota ini sudah punya catatan kegiatan, sehingga tidak boleh dihapus. Ubah statusnya menjadi LULUS atau NONAKTIF agar riwayatnya tetap utuh.",
    };
  }
  if (anggota.role === "KEPALA_LAB" && (await tersisaKepalaLab(idAnggota)) === 0) {
    return { galat: "Ini satu-satunya Kepala Laboratorium yang aktif." };
  }

  await prisma.user.delete({ where: { id: idAnggota } });
  await catatAudit({
    userId: pengguna.id,
    aksi: "HAPUS_ANGGOTA",
    entitas: "User",
    entitasId: idAnggota,
    dataLama: { ...anggota, passwordHash: undefined, _count: undefined },
  });

  revalidatePath("/anggota");
  redirect("/anggota");
}
