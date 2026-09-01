import Link from "next/link";

import { KepalaHalaman } from "@/components/kepala-halaman";
import { Badge } from "@/components/ui/badge";
import { Button, gayaTombol } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { wajibIzin } from "@/lib/penjaga";
import { prisma } from "@/lib/prisma";
import { tanggalPendekWib } from "@/lib/waktu";
import { aktifkanPeriode } from "./aksi";
import { FormulirPeriode } from "./formulir";

export const dynamic = "force-dynamic";
export const metadata = { title: "Periode & Target" };

/** Bentuk yyyy-mm-dd untuk isian <input type="date">. */
function untukIsian(tanggal: Date): string {
  return tanggal.toISOString().slice(0, 10);
}

export default async function HalamanPeriode() {
  await wajibIzin("periode_target", "tulis");

  const periode = await prisma.period.findMany({
    orderBy: [{ aktif: "desc" }, { tanggalMulai: "desc" }],
    include: { _count: { select: { snapshots: true, skk: true } } },
  });

  return (
    <>
      <KepalaHalaman
        judul="Periode & Target"
        keterangan="Mengubah target berarti mengubah skor seluruh anggota sekaligus. Setiap perubahan tercatat di audit log."
        aksi={
          <Link href="/periode/baru" className={gayaTombol()}>
            + Periode baru
          </Link>
        }
      />

      <Card className="mb-4 border-utama/30 bg-utama-lembut/40">
        <CardContent>
          <p className="text-sm text-utama">
            Surat Keterangan Kontribusi yang sudah terbit <strong>tidak ikut berubah</strong> bila
            target diubah setelahnya. Setiap surat menyimpan sendiri angka pada saat penerbitannya —
            surat yang sudah keluar adalah dokumen resmi.
          </p>
        </CardContent>
      </Card>

      {periode.map((p) => (
        <Card key={p.id} className="mb-4">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>
                  {p.nama}{" "}
                  {p.aktif ? <Badge variant="berhasil">Sedang berjalan</Badge> : null}
                </CardTitle>
                <CardDescription>
                  {tanggalPendekWib(p.tanggalMulai)} – {tanggalPendekWib(p.tanggalSelesai)} ·{" "}
                  {p._count.snapshots} snapshot · {p._count.skk} surat terbit
                </CardDescription>
              </div>
              {!p.aktif ? (
                <form action={aktifkanPeriode.bind(null, p.id)}>
                  <Button type="submit" variant="garis" size="kecil">
                    Jadikan berjalan
                  </Button>
                </form>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            <FormulirPeriode
              nilai={{
                id: p.id,
                nama: p.nama,
                tanggalMulai: untukIsian(p.tanggalMulai),
                tanggalSelesai: untukIsian(p.tanggalSelesai),
                targetHadir: p.targetHadir,
                targetSesiBerbagi: p.targetSesiBerbagi,
                targetPiket: p.targetPiket,
                targetLogbook: p.targetLogbook,
                ambangLulus: p.ambangLulus,
                aktif: p.aktif,
              }}
            />
          </CardContent>
        </Card>
      ))}

    </>
  );
}
