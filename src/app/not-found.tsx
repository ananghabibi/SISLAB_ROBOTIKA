import Link from "next/link";

import { gayaTombol } from "@/components/ui/button";

/**
 * Halaman 404.
 *
 * Ditulis sendiri supaya alamat yang salah ketik tidak berakhir di halaman
 * bawaan Next.js yang berbahasa Inggris dan tanpa jalan kembali.
 */
export default function TidakDitemukan() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-5 py-10 text-center">
      <p className="text-5xl font-bold text-utama">404</p>
      <h1 className="text-xl font-semibold">Halaman ini tidak ada</h1>
      <p className="text-sm text-teks-redup">
        Alamatnya mungkin salah ketik, atau halamannya sudah dipindahkan. Menu di Dasbor memuat
        seluruh halaman yang menjadi hak akses Anda.
      </p>
      <div className="flex justify-center">
        <Link href="/dasbor" className={gayaTombol({ className: "px-4" })}>
          Kembali ke Dasbor
        </Link>
      </div>
    </main>
  );
}
