import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { alamatUntukPonsel } from "@/lib/alamat-peladen";
import { FormulirMasuk } from "./formulir";

export const metadata = { title: "Masuk" };

/** Pesan galat yang dikirim callback signIn lewat parameter `galat`. */
const PESAN_GALAT: Record<string, string> = {
  BukanAnggota:
    "Surel ini belum terdaftar sebagai anggota Laboratorium Robotika. Akun tidak dibuat otomatis dari hasil login — daftar anggota berasal dari SK Keanggotaan. Hubungi Koordinator Operasional.",
  DomainBukanKampus: "Gunakan surel kampus. Surel di luar domain kampus tidak dapat dipakai masuk.",
  StatusTidakAktif:
    "Status keanggotaan Anda bukan AKTIF atau CUTI, sehingga akses ditutup. Hubungi Kepala Laboratorium.",
  Configuration:
    "Konfigurasi autentikasi belum lengkap di peladen. Periksa AUTH_SECRET dan kredensial Google pada berkas .env.",
  AccessDenied: "Akses ditolak oleh penyedia identitas.",
};

export default async function HalamanMasuk({
  searchParams,
}: {
  searchParams: Promise<{ galat?: string; error?: string; lanjut?: string }>;
}) {
  const sesi = await auth();
  const { galat, error, lanjut } = await searchParams;
  const alamatPonsel = alamatUntukPonsel(await headers());

  if (sesi?.user?.id) redirect(lanjut ?? "/dasbor");

  const kunciGalat = galat ?? error;
  const pesan = kunciGalat
    ? (PESAN_GALAT[kunciGalat] ?? "Gagal masuk. Silakan coba lagi.")
    : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-5 py-10">
      <header className="text-center">
        <p className="text-sm font-semibold tracking-wide text-utama">SILAB</p>
        <h1 className="mt-1 text-2xl font-bold">Laboratorium Robotika</h1>
        <p className="mt-1 text-sm text-teks-redup">
          Fakultas Teknik · Universitas Islam Malang
        </p>
      </header>

      {pesan ? (
        <p
          role="alert"
          className="rounded-lg border border-bahaya/30 bg-bahaya-lembut px-3 py-2 text-sm text-bahaya"
        >
          {pesan}
        </p>
      ) : null}

      <FormulirMasuk lanjut={lanjut ?? "/dasbor"} />

      <p className="text-center text-xs text-teks-redup">
        Absensi harian hanya dapat dilakukan dari dalam jaringan WiFi laboratorium.
      </p>

      {/* Alamat peladen disebutkan apa adanya. Pada laptop pengembangan
          alamatnya berubah setiap kali WiFi menyambung ulang, dan yang membuka
          halaman ini di laptop dapat langsung membacakannya kepada yang
          memegang ponsel. */}
      {alamatPonsel ? (
        <p className="text-center text-xs text-teks-redup">
          Alamat peladen saat ini:{" "}
          <span className="font-mono font-semibold text-teks">{alamatPonsel}</span>
        </p>
      ) : null}
    </main>
  );
}
