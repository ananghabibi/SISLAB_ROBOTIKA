import { KepalaHalaman } from "@/components/kepala-halaman";
import { Card, CardContent } from "@/components/ui/card";
import { wajibIzin } from "@/lib/penjaga";
import { prisma } from "@/lib/prisma";
import { FormulirAset } from "../formulir";

export const metadata = { title: "Tambah aset" };

export default async function TambahAset() {
  await wajibIzin("inventaris", "tulis");

  const anggota = await prisma.user.findMany({
    where: { status: { in: ["AKTIF", "CUTI"] } },
    orderBy: { nama: "asc" },
    select: { id: true, nama: true },
  });

  return (
    <>
      <KepalaHalaman
        judul="Tambah aset"
        keterangan="Untuk satu-dua alat baru. Pemuatan daftar sekaligus di awal periode lebih baik lewat data/aset-data.csv."
        kembali={{ href: "/inventaris", label: "Kembali ke inventaris" }}
      />

      <Card>
        <CardContent>
          {/* Formulirnya tidak mengalihkan halaman setelah berhasil, melainkan
              mengosongkan diri: mencatat sepuluh alat sekaligus adalah pekerjaan
              satu sore, dan kembali ke daftar tiap satu alat berarti sepuluh kali
              menggulir dan sepuluh kali menekan "Tambah aset" lagi. */}
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
    </>
  );
}
