// -----------------------------------------------------------------------------
// /peminjaman — alat yang sedang di luar, dan riwayat yang sudah kembali.
//
// Urutannya sengaja: yang belum kembali di atas, yang paling dekat tenggatnya
// paling atas. Halaman ini dibuka untuk menjawab satu pertanyaan — "alat apa
// yang masih di luar dan siapa yang memegangnya" — bukan untuk membaca arsip.
// -----------------------------------------------------------------------------

import Link from "next/link";

import { KepalaHalaman } from "@/components/kepala-halaman";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { pinjamanBerjalan, riwayatPinjaman, sudahLewatTenggat } from "@/lib/inventaris";
import { saringanPeminjaman, wajibIzin } from "@/lib/penjaga";
import { bolehTulis } from "@/lib/rbac";
import { tanggalDanJamWib, tanggalPendekWib } from "@/lib/waktu";
import { FormulirKembali } from "./formulir-kembali";

export const dynamic = "force-dynamic";
export const metadata = { title: "Peminjaman" };

const WARNA_KONDISI: Record<string, "berhasil" | "peringatan" | "bahaya" | "netral"> = {
  BAIK: "berhasil",
  PERLU_DICEK: "peringatan",
  RUSAK_RINGAN: "peringatan",
  RUSAK: "bahaya",
  DALAM_PERBAIKAN: "peringatan",
  DALAM_PENGEMBANGAN: "netral",
  TERPAKAI: "netral",
  HILANG: "bahaya",
};

export default async function HalamanPeminjaman() {
  const { pengguna } = await wajibIzin("peminjaman", "baca");

  // Anggota biasa hanya melihat pinjamannya sendiri; saringannya masuk ke dalam
  // kueri, bukan disaring setelah semuanya terlanjur terbaca.
  const saringan = saringanPeminjaman(pengguna);
  const [berjalan, riwayat] = await Promise.all([
    pinjamanBerjalan(saringan),
    riwayatPinjaman(saringan, 30),
  ]);

  const bolehCatat = bolehTulis(pengguna.role, "peminjaman");
  const sekarang = new Date();
  const terlambat = berjalan.filter((p) => sudahLewatTenggat(p.rencanaKembali, sekarang)).length;

  return (
    <>
      <KepalaHalaman
        judul="Peminjaman"
        keterangan={
          berjalan.length === 0
            ? "Tidak ada alat yang sedang di luar."
            : `${berjalan.length} alat sedang dipinjam${terlambat > 0 ? `, ${terlambat} lewat tenggat` : ""}.`
        }
        aksi={
          bolehCatat ? (
            <Link
              href="/peminjaman/baru"
              className="inline-flex min-h-11 items-center rounded-lg bg-utama px-4 text-sm font-semibold text-white hover:opacity-90"
            >
              Catat peminjaman
            </Link>
          ) : null
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Belum kembali</CardTitle>
          <CardDescription>Diurutkan dari tenggat yang paling dekat.</CardDescription>
        </CardHeader>
        <CardContent>
          {berjalan.length === 0 ? (
            <p className="text-sm text-teks-redup">Semua alat ada di laboratorium.</p>
          ) : (
            <ul className="divide-y divide-garis">
              {berjalan.map((p) => {
                const lewat = sudahLewatTenggat(p.rencanaKembali, sekarang);
                return (
                  <li key={p.id} className="py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">
                          {p.asset.kodeAset} — {p.asset.nama}
                          {p.jumlah > 1 ? ` (${p.jumlah})` : ""}
                        </p>
                        <p className="text-sm text-teks-redup">
                          {p.peminjam.nama}
                          {p.peminjam.squad ? ` · ${p.peminjam.squad.kode}` : ""} · diserahkan{" "}
                          {p.petugasPinjam.nama}
                        </p>
                        <p className="mt-1 text-sm">{p.keperluan}</p>
                      </div>
                      <Badge variant={lewat ? "bahaya" : "utama"}>
                        {lewat ? "Terlambat" : "Dipinjam"} · {tanggalPendekWib(p.rencanaKembali)}
                      </Badge>
                    </div>

                    {bolehCatat ? (
                      <details className="mt-3">
                        <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-utama">
                          Catat pengembalian
                        </summary>
                        <div className="mt-3 rounded-lg border border-garis p-3">
                          <FormulirKembali pinjamanId={p.id} />
                        </div>
                      </details>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat</CardTitle>
          <CardDescription>30 pengembalian terakhir.</CardDescription>
        </CardHeader>
        <CardContent>
          {riwayat.length === 0 ? (
            <p className="text-sm text-teks-redup">Belum ada pengembalian tercatat.</p>
          ) : (
            <ul className="divide-y divide-garis">
              {riwayat.map((p) => (
                <li key={p.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                  <div>
                    <p className="font-semibold">
                      {p.asset.kodeAset} — {p.asset.nama}
                    </p>
                    <p className="text-sm text-teks-redup">
                      {p.peminjam.nama} · kembali{" "}
                      {p.tglKembali ? tanggalDanJamWib(p.tglKembali) : "—"}
                      {p.petugasKembali ? ` · diterima ${p.petugasKembali.nama}` : ""}
                    </p>
                    {p.catatan ? <p className="mt-1 text-sm">{p.catatan}</p> : null}
                  </div>
                  {p.kondisiKembali ? (
                    <Badge variant={WARNA_KONDISI[p.kondisiKembali] ?? "netral"}>
                      {p.kondisiKembali.replaceAll("_", " ")}
                    </Badge>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
