"use client";

// -----------------------------------------------------------------------------
// Batas galat untuk seluruh halaman di dalam aplikasi.
//
// Tanpa berkas ini, satu kueri yang gagal menampilkan halaman galat bawaan
// Next.js: tumpukan pemanggilan berbahasa Inggris, tanpa menu, tanpa jalan
// kembali. Yang membukanya di ponsel sambil berdiri di pintu laboratorium
// hanya melihat aplikasi yang rusak dan tidak tahu harus berbuat apa.
//
// Menu tetap terlihat karena berkas ini berada DI DALAM (aplikasi), sehingga
// tata letaknya tidak ikut runtuh — orang masih bisa pindah halaman alih-alih
// menutup peramban.
// -----------------------------------------------------------------------------

import { useEffect } from "react";

import Link from "next/link";

import { KepalaHalaman } from "@/components/kepala-halaman";
import { Button, gayaTombol } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function GalatAplikasi({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Ditulis ke konsol peramban supaya pengurus yang membuka Developer Tools
    // melihat galat aslinya. Pesan aslinya sengaja TIDAK ditampilkan di layar:
    // pesan Prisma memuat nama tabel dan bentuk kueri.
    console.error("[silab] galat halaman:", error);
  }, [error]);

  return (
    <>
      <KepalaHalaman
        judul="Halaman ini gagal dimuat"
        keterangan="Yang Anda kerjakan sebelumnya tidak hilang."
      />
      <Card>
        <CardContent className="space-y-4">
          <p className="text-sm">
            Ada yang gagal saat menyiapkan halaman ini. Kemungkinan terbesarnya basis data sedang
            tidak dapat dihubungi, atau ada pembaruan yang belum selesai dijalankan.
          </p>

          <div className="rounded-lg bg-dasar px-3 py-3 text-sm">
            <p className="font-semibold">Yang dapat dicoba, berurutan:</p>
            <ol className="mt-1 list-inside list-decimal space-y-1 text-teks-redup">
              <li>Tekan &ldquo;Coba lagi&rdquo; — sebagian gangguan hanya sesaat.</li>
              <li>Buka halaman lain lewat menu; bila yang lain normal, gangguannya di halaman ini saja.</li>
              <li>
                Bila seluruh halaman bermasalah, laporkan ke Koordinator Operasional beserta kode
                di bawah. Absensi sementara dicatat manual.
              </li>
            </ol>
          </div>

          {error.digest ? (
            <p className="text-xs text-teks-redup">
              Kode galat: <code className="font-mono">{error.digest}</code> — sebutkan kode ini saat
              melapor, karena dengannya catatan peladen dapat ditemukan.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={reset}>
              Coba lagi
            </Button>
            <Link href="/dasbor" className={gayaTombol({ variant: "garis", className: "px-4" })}>
              Kembali ke Dasbor
            </Link>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
