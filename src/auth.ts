// -----------------------------------------------------------------------------
// Autentikasi SILAB.
//
// Dua jalur masuk:
//   1. Google, dibatasi domain surel kampus — untuk anggota mahasiswa.
//   2. Credentials (surel + kata sandi) — untuk akun dosen yang tidak memakai
//      surel Google kampus.
//
// Keduanya tunduk pada satu aturan yang sama: surel HARUS sudah terdaftar
// sebagai anggota di basis data. Sistem ini tidak pernah membuat akun baru dari
// hasil login. Daftar anggota berasal dari SK Keanggotaan, bukan dari siapa pun
// yang kebetulan punya surel kampus.
//
// Adapter Prisma sengaja tidak dipakai. Anggota sudah lebih dulu ada di basis
// data, sehingga adapter justru akan menolak menautkan akun Google ke surel
// yang sama (OAuthAccountNotLinked). Sesi memakai JWT dan peran disegarkan
// berkala dari basis data.
// -----------------------------------------------------------------------------

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { authConfig } from "./auth.config";
import { prisma } from "./lib/prisma";

/** Anggota berstatus NONAKTIF atau LULUS tidak boleh masuk lagi. */
const STATUS_BOLEH_MASUK = ["AKTIF", "CUTI"] as const;

/** Seberapa sering peran dibaca ulang dari basis data (detik). */
const JEDA_SEGARKAN_PERAN = 5 * 60;

function domainKampusDiizinkan(): string[] {
  return (process.env.ALLOWED_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

function domainSurelCocok(email: string): boolean {
  const daftar = domainKampusDiizinkan();
  // Daftar kosong berarti belum dikonfigurasi. Menolak semua lebih aman
  // daripada membuka pintu untuk sembarang alamat Gmail.
  if (daftar.length === 0) return false;
  const domain = email.toLowerCase().split("@")[1] ?? "";
  return daftar.includes(domain);
}

async function cariAnggota(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      nama: true,
      npm: true,
      email: true,
      role: true,
      jenjang: true,
      status: true,
      squadId: true,
      fakultas: true,
      avatarUrl: true,
      squad: { select: { nama: true } },
    },
  });
}

const skemaKredensial = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // Membatasi pemilih akun Google ke domain kampus. Ini hanya kenyamanan;
      // penolakan yang sebenarnya tetap dilakukan di callback signIn.
      authorization: {
        params: { hd: domainKampusDiizinkan()[0], prompt: "select_account" },
      },
    }),
    Credentials({
      name: "Akun Dosen",
      credentials: {
        email: { label: "Surel", type: "email" },
        password: { label: "Kata sandi", type: "password" },
      },
      async authorize(kredensial) {
        const terurai = skemaKredensial.safeParse(kredensial);
        if (!terurai.success) return null;

        const anggota = await prisma.user.findUnique({
          where: { email: terurai.data.email.toLowerCase() },
          select: { id: true, email: true, nama: true, passwordHash: true, status: true },
        });

        // Tidak membedakan "surel tidak ada" dari "kata sandi salah": pesan yang
        // membedakan keduanya memberi tahu penebak bahwa surelnya benar.
        if (!anggota?.passwordHash) return null;
        if (!STATUS_BOLEH_MASUK.includes(anggota.status as (typeof STATUS_BOLEH_MASUK)[number])) {
          return null;
        }

        const cocok = await bcrypt.compare(terurai.data.password, anggota.passwordHash);
        if (!cocok) return null;

        return { id: anggota.id, email: anggota.email, name: anggota.nama };
      },
    }),
  ],
  callbacks: {
    // `session` diwarisi dari authConfig agar middleware Edge memakai pemetaan
    // yang sama persis dengan peladen.
    ...authConfig.callbacks,

    async signIn({ user, account }) {
      const email = user.email?.toLowerCase();
      if (!email) return false;

      if (account?.provider === "google") {
        if (!domainSurelCocok(email)) return "/masuk?galat=DomainBukanKampus";
        const anggota = await cariAnggota(email);
        if (!anggota) return "/masuk?galat=BukanAnggota";
        if (!STATUS_BOLEH_MASUK.includes(anggota.status as (typeof STATUS_BOLEH_MASUK)[number])) {
          return "/masuk?galat=StatusTidakAktif";
        }
      }

      return true;
    },

    async jwt({ token, user, trigger }) {
      const sekarang = Math.floor(Date.now() / 1000);
      const perluSegarkan =
        Boolean(user) ||
        trigger === "update" ||
        !token.uid ||
        sekarang - (token.segarPada ?? 0) > JEDA_SEGARKAN_PERAN;

      if (!perluSegarkan) return token;

      const email = (user?.email ?? token.email) as string | undefined;
      if (!email) return token;

      const anggota = await cariAnggota(email);
      if (!anggota) {
        // Anggota dihapus atau surelnya diganti selagi sesi berjalan.
        // Kosongkan uid supaya middleware memaksa masuk ulang.
        token.uid = "";
        return token;
      }

      token.uid = anggota.id;
      token.email = anggota.email;
      token.nama = anggota.nama;
      token.npm = anggota.npm;
      token.role = anggota.role;
      token.jenjang = anggota.jenjang;
      token.status = anggota.status;
      token.squadId = anggota.squadId;
      token.squadNama = anggota.squad?.nama ?? null;
      token.fakultas = anggota.fakultas;
      token.picture = anggota.avatarUrl ?? token.picture;
      token.segarPada = sekarang;

      return token;
    },

  },
});
