import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Panel saringan yang seragam untuk semua halaman berisi daftar.
 *
 * Tiga hal yang diperbaikinya, dan ketiganya pernah terasa di layar ponsel:
 *
 * 1. Panelnya tertutup selama tidak ada saringan yang menyala. Sebelumnya ia
 *    selalu terbuka dan memakan setengah layar pertama, sehingga daftar yang
 *    sebenarnya dicari orang justru terdorong ke bawah lipatan.
 * 2. Kalau ada saringan yang menyala, panelnya terbuka sendiri dan jumlahnya
 *    tertulis di kepalanya. Daftar yang tiba-tiba pendek tidak lagi terbaca
 *    seperti data yang hilang.
 * 3. Ada jalan keluarnya. Dulu satu-satunya cara membatalkan saringan adalah
 *    mengembalikan tiap kolom ke "Semua" satu per satu.
 *
 * Memakai <details>, bukan state React: tidak ada JavaScript yang perlu tiba
 * lebih dulu, sehingga panelnya sudah dapat dibuka pada gambar pertama.
 */
export function PanelSaringan({
  jalur,
  jumlahAktif,
  children,
}: {
  /** Alamat halaman tanpa kueri, untuk tombol "Bersihkan". */
  jalur: string;
  /** Berapa banyak saringan yang sedang menyala. */
  jumlahAktif: number;
  children: React.ReactNode;
}) {
  const aktif = jumlahAktif > 0;

  return (
    <Card className="mb-4">
      <details open={aktif} className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-2 text-sm font-semibold sm:px-5 [&::-webkit-details-marker]:hidden">
          <span>Saringan</span>
          {aktif ? (
            <span className="rounded-full bg-utama-lembut px-2 py-0.5 text-xs font-semibold text-utama">
              {jumlahAktif} menyala
            </span>
          ) : null}
          <span className="ml-auto text-sm font-medium text-utama">
            <span className="group-open:hidden">Buka</span>
            <span className="hidden group-open:inline">Tutup</span>
          </span>
        </summary>

        <div className="border-t border-garis px-4 py-4 sm:px-5">
          <form method="get" role="search" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {children}
            <div className="flex gap-2">
              <Button type="submit" variant="garis" className="flex-1">
                Terapkan
              </Button>
              {aktif ? (
                <Link
                  href={jalur}
                  className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-utama"
                >
                  Bersihkan
                </Link>
              ) : null}
            </div>
          </form>
        </div>
      </details>
    </Card>
  );
}

/**
 * Kartu "tidak ada yang cocok" beserta jalan keluarnya.
 *
 * Daftar kosong tanpa tombol pembatal adalah jalan buntu: yang tersaring
 * habis tidak punya apa pun untuk ditekan, dan dari kursinya keadaan itu tidak
 * dapat dibedakan dari basis data yang kosong.
 */
export function DaftarKosong({
  pesan,
  jalur,
  adaSaringan,
}: {
  pesan: string;
  jalur: string;
  adaSaringan: boolean;
}) {
  return (
    <Card>
      <div className="px-4 py-8 text-center sm:px-5">
        <p className="text-sm text-teks-redup">{pesan}</p>
        {adaSaringan ? (
          <Link
            href={jalur}
            className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-garis px-4 text-sm font-semibold hover:bg-utama-lembut"
          >
            Bersihkan saringan
          </Link>
        ) : null}
      </div>
    </Card>
  );
}
