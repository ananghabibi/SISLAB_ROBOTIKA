import type { Prisma } from "@prisma/client";
import Link from "next/link";

import { KepalaHalaman } from "@/components/kepala-halaman";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { kondisiAsetSah } from "@/lib/aset";
import { daftarAset, sudahLewatTenggat } from "@/lib/inventaris";
import { wajibIzin } from "@/lib/penjaga";
import { prisma } from "@/lib/prisma";
import { bolehHapus, bolehTulis } from "@/lib/rbac";
import { tanggalPendekWib } from "@/lib/waktu";
import { hapusAset } from "./aksi";
import { FormulirAset } from "./formulir";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inventaris" };

const WARNA_KONDISI: Record<string, "berhasil" | "peringatan" | "bahaya" | "netral" | "utama"> = {
  BAIK: "berhasil",
  PERLU_DICEK: "peringatan",
  RUSAK_RINGAN: "peringatan",
  RUSAK: "bahaya",
  DALAM_PERBAIKAN: "peringatan",
  DALAM_PENGEMBANGAN: "utama",
  TERPAKAI: "netral",
  HILANG: "bahaya",
};

export default async function HalamanInventaris({
  searchParams,
}: {
  searchParams: Promise<{ cari?: string; kategori?: string; kondisi?: string }>;
}) {
  const { pengguna } = await wajibIzin("inventaris", "baca");
  const filter = await searchParams;

  const where: Prisma.AssetWhereInput = {
    ...(filter.cari
      ? {
          OR: [
            { nama: { contains: filter.cari, mode: "insensitive" } },
            { kodeAset: { contains: filter.cari, mode: "insensitive" } },
            { merk: { contains: filter.cari, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(filter.kategori ? { kategori: filter.kategori } : {}),
    ...(filter.kondisi && kondisiAsetSah(filter.kondisi) ? { kondisi: filter.kondisi } : {}),
  };

  const [aset, kategori, anggota] = await Promise.all([
    daftarAset(where),
    prisma.asset.findMany({ distinct: ["kategori"], select: { kategori: true }, orderBy: { kategori: "asc" } }),
    prisma.user.findMany({
      where: { status: { in: ["AKTIF", "CUTI"] } },
      orderBy: { nama: "asc" },
      select: { id: true, nama: true },
    }),
  ]);

  const bolehSunting = bolehTulis(pengguna.role, "inventaris");
  const bolehPinjamkan = bolehTulis(pengguna.role, "peminjaman");
  const bolehBuang = bolehHapus(pengguna.role, "inventaris");
  const contoh = aset.filter((a) => a.kodeAset.startsWith("CONTOH-")).length;

  // Label dicetak untuk apa yang sedang terlihat, bukan untuk seluruh gudang.
  const kueriLabel = new URLSearchParams();
  if (filter.cari) kueriLabel.set("cari", filter.cari);
  if (filter.kategori) kueriLabel.set("kategori", filter.kategori);
  if (filter.kondisi) kueriLabel.set("kondisi", filter.kondisi);
  const tautanLabel = `/api/inventaris/label-qr${kueriLabel.size ? `?${kueriLabel}` : ""}`;

  return (
    <>
      <KepalaHalaman
        judul="Inventaris"
        keterangan={`${aset.length} aset tercatat.`}
        aksi={
          bolehSunting ? (
            <a
              href={tautanLabel}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center rounded-lg border border-garis bg-permukaan px-4 text-sm font-semibold hover:bg-utama-lembut"
            >
              Cetak label QR{kueriLabel.size ? ` (${aset.length})` : ""}
            </a>
          ) : null
        }
      />

      {contoh > 0 && bolehSunting ? (
        <Card className="mb-4 border-peringatan/40 bg-peringatan-lembut/40">
          <CardContent>
            <p className="text-sm text-peringatan">
              <strong>{contoh} aset masih data contoh.</strong> Ganti isi{" "}
              <code>data/aset-data.csv</code> dengan master inventaris yang sebenarnya, lalu
              jalankan ulang seeder — atau sunting satu per satu di halaman ini.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mb-4">
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input name="cari" placeholder="Cari nama, kode, atau merk" defaultValue={filter.cari} />
            <Select name="kategori" defaultValue={filter.kategori ?? ""}>
              <option value="">Semua kategori</option>
              {kategori.map((k) => (
                <option key={k.kategori} value={k.kategori}>
                  {k.kategori}
                </option>
              ))}
            </Select>
            <Select name="kondisi" defaultValue={filter.kondisi ?? ""}>
              <option value="">Semua kondisi</option>
              {Object.keys(WARNA_KONDISI).map((k) => (
                <option key={k} value={k}>
                  {k.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="garis">
              Saring
            </Button>
          </form>
        </CardContent>
      </Card>

      {aset.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-sm text-teks-redup">Tidak ada aset yang cocok dengan saringan.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {aset.map((a) => {
            const pinjaman = a.loans[0];
            const terlambat = pinjaman ? sudahLewatTenggat(pinjaman.rencanaKembali) : false;

            return (
              <Card key={a.id}>
                <CardContent>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">
                        <span className="font-mono text-sm text-teks-redup">{a.kodeAset}</span>{" "}
                        {a.nama}
                      </p>
                      <p className="text-sm text-teks-redup">
                        {a.kategori}
                        {a.merk ? ` · ${a.merk}` : ""} · {a.jumlah} {a.satuan} · {a.lokasi}
                        {a.penanggungJawab ? ` · PJ ${a.penanggungJawab.nama}` : ""}
                      </p>
                      {a.keterangan ? (
                        <p className="mt-1 text-sm text-teks-redup">{a.keterangan}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={WARNA_KONDISI[a.kondisi] ?? "netral"}>
                        {a.kondisi.replace(/_/g, " ")}
                      </Badge>
                      {!a.bolehDipinjam ? <Badge>Tidak dipinjamkan</Badge> : null}
                      {pinjaman ? (
                        <Badge variant={terlambat ? "bahaya" : "peringatan"}>
                          {terlambat ? "Terlambat" : "Dipinjam"} · {pinjaman.peminjam.nama}
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  {pinjaman ? (
                    <p className="mt-2 text-sm text-teks-redup">
                      Rencana kembali {tanggalPendekWib(pinjaman.rencanaKembali)}
                    </p>
                  ) : null}

                  {bolehPinjamkan && a.bolehDipinjam && !pinjaman ? (
                    <Link
                      href={`/peminjaman/baru?kode=${encodeURIComponent(a.kodeAset)}`}
                      className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-utama"
                    >
                      Pinjamkan alat ini
                    </Link>
                  ) : null}

                  {bolehSunting ? (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-medium text-utama">
                        Ubah aset
                      </summary>
                      <div className="mt-3 border-t border-garis pt-3">
                        <FormulirAset
                          anggota={anggota}
                          nilai={{
                            id: a.id,
                            kodeAset: a.kodeAset,
                            nama: a.nama,
                            kategori: a.kategori,
                            merk: a.merk ?? "",
                            jumlah: a.jumlah,
                            satuan: a.satuan,
                            kondisi: a.kondisi,
                            lokasi: a.lokasi,
                            tahunPerolehan: a.tahunPerolehan?.toString() ?? "",
                            penanggungJawabId: a.penanggungJawabId ?? "",
                            bolehDipinjam: a.bolehDipinjam,
                            keterangan: a.keterangan ?? "",
                          }}
                        />
                        {bolehBuang ? (
                          <form action={hapusAset.bind(null, a.id)} className="mt-4">
                            <Button type="submit" variant="bahaya" size="kecil">
                              Hapus aset
                            </Button>
                            <p className="mt-1 text-xs text-teks-redup">
                              Hanya untuk baris yang salah masuk. Aset yang pernah dipinjam tidak
                              dapat dihapus — riwayat peminjamannya adalah bukti siapa memegang apa.
                              Untuk alat yang sudah tidak ada, pakai kondisi HILANG.
                            </p>
                          </form>
                        ) : null}
                      </div>
                    </details>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {bolehSunting ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Tambah aset</CardTitle>
            <CardDescription>
              Untuk satu-dua alat baru. Pemuatan daftar sekaligus lebih baik lewat{" "}
              <code>data/aset-data.csv</code>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormulirAset
              anggota={anggota}
              nilai={{
                id: null,
                kodeAset: "",
                nama: "",
                kategori: "",
                merk: "",
                jumlah: 1,
                satuan: "unit",
                kondisi: "BAIK",
                lokasi: "",
                tahunPerolehan: "",
                penanggungJawabId: "",
                bolehDipinjam: true,
                keterangan: "",
              }}
            />
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
