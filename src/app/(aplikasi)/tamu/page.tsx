import type { Prisma } from "@prisma/client";

import { KepalaHalaman } from "@/components/kepala-halaman";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { PanelSaringan } from "@/components/ui/panel-saringan";
import { wajibIzin } from "@/lib/penjaga";
import { prisma } from "@/lib/prisma";
import { bolehTulis } from "@/lib/rbac";
import { jamWib, tanggalKalenderWib, tanggalPendekWib } from "@/lib/waktu";
import { FormulirTamu, TombolPulang } from "./formulir";

export const dynamic = "force-dynamic";
export const metadata = { title: "Buku Tamu" };

export default async function Halaman({
  searchParams,
}: {
  searchParams: Promise<{ cari?: string }>;
}) {
  // Buku tamu memakai modul `insiden` pada tabel hak akses: keduanya sama-sama
  // catatan ruangan yang boleh diisi siapa pun yang sedang berada di dalamnya,
  // dan SPEC 4.2 tidak memberinya baris tersendiri.
  const { pengguna } = await wajibIzin("insiden", "baca");
  const bolehMencatat = bolehTulis(pengguna.role, "insiden");
  const hariIni = tanggalKalenderWib();

  // Saringan hanya menyaring riwayat; daftar "sedang di lab" adalah keadaan
  // ruangan saat ini dan selalu ditampilkan utuh.
  const cari = (await searchParams).cari?.trim() ?? "";
  const cariRiwayat: Prisma.GuestWhereInput = cari
    ? {
        OR: [
          { nama: { contains: cari, mode: "insensitive" } },
          { instansi: { contains: cari, mode: "insensitive" } },
          { keperluan: { contains: cari, mode: "insensitive" } },
          { pendamping: { is: { nama: { contains: cari, mode: "insensitive" } } } },
        ],
      }
    : {};

  const [anggota, sedangDiLab, riwayat] = await Promise.all([
    bolehMencatat
      ? prisma.user.findMany({
          where: { status: "AKTIF" },
          select: { id: true, nama: true },
          orderBy: { nama: "asc" },
        })
      : Promise.resolve([]),
    prisma.guest.findMany({
      where: { jamKeluar: null },
      include: { pendamping: { select: { nama: true } } },
      orderBy: { jamMasuk: "asc" },
    }),
    prisma.guest.findMany({
      where: { jamKeluar: { not: null }, ...cariRiwayat },
      include: { pendamping: { select: { nama: true } } },
      orderBy: [{ tanggal: "desc" }, { jamMasuk: "desc" }],
      take: 50,
    }),
  ]);

  return (
    <>
      <KepalaHalaman
        judul="Buku Tamu"
        keterangan={`${sedangDiLab.length} tamu sedang berada di laboratorium.`}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {bolehMencatat ? (
          <Card>
            <CardHeader>
              <CardTitle>Tamu masuk</CardTitle>
            </CardHeader>
            <CardContent>
              <FormulirTamu anggota={anggota} pendampingBawaan={pengguna.id} />
            </CardContent>
          </Card>
        ) : null}

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Sedang di laboratorium</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sedangDiLab.length === 0 ? (
                <p className="py-4 text-center text-sm text-teks-redup">
                  Tidak ada tamu di dalam laboratorium.
                </p>
              ) : null}
              {sedangDiLab.map((tamu) => (
                <div key={tamu.id} className="rounded-lg border border-garis p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="mr-auto font-semibold">{tamu.nama}</p>
                    {tamu.tanggal.getTime() !== hariIni.getTime() ? (
                      <Badge variant="peringatan">Sejak {tanggalPendekWib(tamu.tanggal)}</Badge>
                    ) : null}
                    <Badge variant="utama">Masuk {jamWib(tamu.jamMasuk)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-teks-redup">
                    {tamu.instansi} · didampingi {tamu.pendamping.nama}
                  </p>
                  <p className="mt-1 text-sm text-teks-redup">{tamu.keperluan}</p>
                  {bolehMencatat ? <TombolPulang tamuId={tamu.id} /> : null}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Riwayat kunjungan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <PanelSaringan jalur="/tamu" jumlahAktif={cari ? 1 : 0}>
                <Input
                  name="cari"
                  placeholder="Cari nama, instansi, atau pendamping"
                  defaultValue={cari}
                  aria-label="Cari riwayat tamu"
                />
              </PanelSaringan>
              {riwayat.length === 0 ? (
                <p className="py-4 text-center text-sm text-teks-redup">
                  {cari ? "Tidak ada riwayat yang cocok dengan saringan." : "Belum ada riwayat."}
                </p>
              ) : null}
              {riwayat.map((tamu) => (
                <div
                  key={tamu.id}
                  className="flex flex-wrap items-baseline gap-x-2 border-b border-garis pb-2 text-sm last:border-0"
                >
                  <span className="font-medium">{tamu.nama}</span>
                  <span className="text-teks-redup">{tamu.instansi}</span>
                  <span className="ml-auto text-teks-redup">
                    {tanggalPendekWib(tamu.tanggal)} · {jamWib(tamu.jamMasuk)}
                    {tamu.jamKeluar ? ` – ${jamWib(tamu.jamKeluar)}` : ""}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
