import type { Prisma } from "@prisma/client";
import Link from "next/link";

import { KepalaHalaman } from "@/components/kepala-halaman";
import { Badge } from "@/components/ui/badge";
import { Button, gayaTombol, TautanTombol } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { DaftarKosong, PanelSaringan } from "@/components/ui/panel-saringan";
import { AWALAN_ASET_CONTOH, kondisiAsetSah } from "@/lib/aset";
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

  const [aset, kategori, anggota, contoh] = await Promise.all([
    daftarAset(where),
    prisma.asset.findMany({ distinct: ["kategori"], select: { kategori: true }, orderBy: { kategori: "asc" } }),
    prisma.user.findMany({
      where: { status: { in: ["AKTIF", "CUTI"] } },
      orderBy: { nama: "asc" },
      select: { id: true, nama: true },
    }),
    // Dihitung atas SELURUH inventaris, bukan atas yang sedang tersaring:
    // "5 aset masih data uji coba" pada saringan Sensor akan terbaca seolah
    // sisa inventarisnya sudah sungguhan.
    prisma.asset.count({ where: { kodeAset: { startsWith: AWALAN_ASET_CONTOH } } }),
  ]);

  const bolehSunting = bolehTulis(pengguna.role, "inventaris");
  const bolehPinjamkan = bolehTulis(pengguna.role, "peminjaman");
  const bolehBuang = bolehHapus(pengguna.role, "inventaris");

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
        keterangan={
          kueriLabel.size
            ? `${aset.length} aset cocok dengan saringan.`
            : `${aset.length} aset tercatat.`
        }
        aksi={
          bolehSunting ? (
            <>
              <TautanTombol href={tautanLabel} target="_blank" rel="noreferrer" variant="garis">
                Cetak label QR{kueriLabel.size ? ` (${aset.length})` : ""}
              </TautanTombol>
              <Link href="/inventaris/baru" className={gayaTombol()}>
                + Tambah aset
              </Link>
            </>
          ) : null
        }
      />

      {contoh > 0 && bolehSunting ? (
        <Card className="mb-4 border-peringatan/40 bg-peringatan-lembut/40">
          <CardContent>
            <p className="text-sm text-peringatan">
              <strong>{contoh} aset masih data uji coba</strong> (berkode{" "}
              <code>{AWALAN_ASET_CONTOH}</code>). Ganti isi <code>data/aset-data.csv</code> dengan
              master inventaris yang sebenarnya lalu jalankan <code>npm run db:seed</code>: sisa
              data uji coba akan terbuang sendiri, kecuali yang terlanjur punya riwayat
              peminjaman.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <PanelSaringan jalur="/inventaris" jumlahAktif={kueriLabel.size}>
        <Input
          name="cari"
          placeholder="Cari nama, kode, atau merk"
          defaultValue={filter.cari}
          aria-label="Cari aset"
        />
        <Select name="kategori" defaultValue={filter.kategori ?? ""} aria-label="Kategori">
          <option value="">Semua kategori</option>
          {kategori.map((k) => (
            <option key={k.kategori} value={k.kategori}>
              {k.kategori}
            </option>
          ))}
        </Select>
        <Select name="kondisi" defaultValue={filter.kondisi ?? ""} aria-label="Kondisi">
          <option value="">Semua kondisi</option>
          {Object.keys(WARNA_KONDISI).map((k) => (
            <option key={k} value={k}>
              {k.replace(/_/g, " ")}
            </option>
          ))}
        </Select>
      </PanelSaringan>

      {aset.length === 0 ? (
        <DaftarKosong
          jalur="/inventaris"
          adaSaringan={kueriLabel.size > 0}
          pesan={
            kueriLabel.size
              ? "Tidak ada aset yang cocok dengan saringan."
              : "Belum ada aset tercatat."
          }
        />
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

    </>
  );
}
