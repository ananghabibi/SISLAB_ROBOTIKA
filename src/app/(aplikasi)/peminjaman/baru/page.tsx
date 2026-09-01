// -----------------------------------------------------------------------------
// /peminjaman/baru — mencatat alat keluar.
//
// Menerima `?kode=` supaya petugas bisa datang dari halaman inventaris dengan
// aset yang sudah terisi, tanpa mengetik ulang kodenya.
// -----------------------------------------------------------------------------

import { KepalaHalaman } from "@/components/kepala-halaman";
import { Card, CardContent } from "@/components/ui/card";
import { bacaKodeAset } from "@/lib/aset";
import { wajibIzin } from "@/lib/penjaga";
import { prisma } from "@/lib/prisma";
import { tanggalKalenderWib } from "@/lib/waktu";
import { FormulirPinjam } from "../formulir-pinjam";

export const dynamic = "force-dynamic";
export const metadata = { title: "Catat peminjaman" };

export default async function HalamanPinjamBaru({
  searchParams,
}: {
  searchParams: Promise<{ kode?: string }>;
}) {
  await wajibIzin("peminjaman", "tulis");
  const { kode } = await searchParams;

  const anggota = await prisma.user.findMany({
    where: { status: "AKTIF" },
    orderBy: { nama: "asc" },
    select: { id: true, nama: true, npm: true },
  });

  // Tenggat paling awal adalah hari ini menurut kalender WIB, bukan menurut
  // jam peladen — keduanya bisa berbeda hari pada dini hari.
  const hariIni = tanggalKalenderWib().toISOString().slice(0, 10);

  return (
    <>
      <KepalaHalaman
        judul="Catat peminjaman"
        keterangan="Yang mencatat adalah petugas; nama Anda tersimpan sebagai penyerah alat."
        kembali={{ href: "/peminjaman", label: "Kembali ke peminjaman" }}
      />

      <Card>
        <CardContent>
          <FormulirPinjam
            anggota={anggota}
            kodeAwal={kode ? (bacaKodeAset(kode) ?? "") : ""}
            tanggalMinimal={hariIni}
          />
        </CardContent>
      </Card>
    </>
  );
}
