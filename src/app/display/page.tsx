// -----------------------------------------------------------------------------
// /display — layar penuh yang dipasang pada monitor di dalam laboratorium.
//
// Tanpa login, karena tidak ada yang perlu masuk untuk sekadar melihat jam di
// dinding. Yang menjaganya adalah lapis jaringan: halaman ini hanya dapat
// dibuka dari dalam laboratorium, dan hanya di sinilah kode harian tampil.
//
// Ketahanan (SPEC bagian 8): bila basis data tidak dapat dihubungi, halaman
// tetap terbuka dan tetap menampilkan jam beserta pesan yang jelas. Layar yang
// mati total membuat orang mengira laboratoriumnya yang tutup.
// -----------------------------------------------------------------------------

import { headers } from "next/headers";

import { sedangDiLab } from "@/lib/absensi";
import { periksaJaringan } from "@/lib/jaringan";
import { pastikanKodeHariIni } from "@/lib/kode-harian";
import { detikPutaran } from "@/lib/token-qr";
import { Layar } from "./layar";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Layar Laboratorium",
  robots: { index: false, follow: false },
};

export default async function HalamanDisplay() {
  const jaringan = periksaJaringan(await headers());

  if (!jaringan.diizinkan) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0b1017] px-6 text-center text-white">
        <p className="text-5xl font-bold text-sky-300">SILAB</p>
        <h1 className="text-2xl font-semibold">Layar ini hanya untuk jaringan laboratorium</h1>
        <p className="max-w-lg text-slate-300">{jaringan.alasan}</p>
        <p className="max-w-lg text-sm text-slate-500">
          Kode harian dan QR absensi memang sengaja tidak dapat dilihat dari luar laboratorium.
          Itulah yang membuat titip absen tidak mungkin dilakukan dari rumah.
        </p>
      </main>
    );
  }

  let kodeHarian: string | null = null;
  let pesanGangguan: string | null = null;
  let orangAwal: Awaited<ReturnType<typeof sedangDiLab>> = [];

  try {
    kodeHarian = (await pastikanKodeHariIni()).kode;
    orangAwal = await sedangDiLab();
  } catch (galat) {
    console.error("[display] basis data tidak dapat dihubungi:", galat);
    pesanGangguan =
      "Basis data laboratorium sedang tidak dapat dihubungi, sehingga kode harian dan QR belum bisa ditampilkan. Absensi untuk sementara dicatat manual oleh Koordinator Operasional. Hubungi beliau.";
  }

  return (
    <Layar
      kodeHarian={kodeHarian}
      detikPutaran={detikPutaran()}
      pesanGangguan={pesanGangguan}
      orangAwal={orangAwal.map((o) => ({
        nama: o.user.nama,
        squad: o.user.squad?.kode ?? null,
        jamMasuk: o.jamMasuk.toISOString(),
        manual: o.manual,
      }))}
    />
  );
}
