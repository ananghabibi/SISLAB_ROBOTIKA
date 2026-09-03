import Link from "next/link";

import { gayaTombol } from "@/components/ui/button";

/**
 * Tampilan tunggal untuk seluruh penolakan hak akses.
 *
 * Dipakai oleh `forbidden()` dari next/navigation, baik yang dipanggil
 * penjagaan di dalam halaman maupun yang dipicu middleware lewat /403.
 * Next.js membalasnya dengan status HTTP 403 yang sebenarnya.
 */
export default function Terlarang() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-5 py-10 text-center">
      <p className="text-5xl font-bold text-utama">403</p>
      <h1 className="text-xl font-semibold">Halaman ini bukan hak akses Anda</h1>
      <p className="text-sm text-teks-redup">
        Penolakan ini terjadi di peladen, bukan sekadar menyembunyikan menu — mengetik alamatnya
        langsung pun tetap ditolak.
      </p>
      <p className="text-sm text-teks-redup">
        Bila menurut Anda ini keliru, hubungi Kepala Laboratorium. Hanya beliau yang dapat mengubah
        peran.
      </p>
      <Link href="/dasbor" className={gayaTombol({ className: "w-full px-4" })}>
        Kembali ke dasbor
      </Link>
    </main>
  );
}
