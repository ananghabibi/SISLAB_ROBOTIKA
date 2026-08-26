import Link from "next/link";

import { Button } from "@/components/ui/button";

/** Ditampilkan saat `unauthorized()` dipanggil: belum ada sesi yang sah. */
export default function BelumMasuk() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-5 py-10 text-center">
      <p className="text-5xl font-bold text-utama">401</p>
      <h1 className="text-xl font-semibold">Anda belum masuk</h1>
      <p className="text-sm text-teks-redup">Masuk dengan akun kampus untuk melanjutkan.</p>
      <Link href="/masuk">
        <Button className="w-full">Halaman masuk</Button>
      </Link>
    </main>
  );
}
