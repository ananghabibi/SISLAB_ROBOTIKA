import Link from "next/link";

import { KepalaHalaman } from "@/components/kepala-halaman";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { wajibIzin } from "@/lib/penjaga";
import { prisma } from "@/lib/prisma";
import { bolehTulis, LABEL_PERAN } from "@/lib/rbac";
import { FormulirAnggota } from "../formulir-anggota";
import { buatAnggota } from "../aksi";

export const metadata = { title: "Tambah anggota" };

export default async function TambahAnggota() {
  const { pengguna } = await wajibIzin("master_anggota", "tulis");
  const squad = await prisma.squad.findMany({
    orderBy: { nama: "asc" },
    select: { id: true, nama: true },
  });

  return (
    <>
      <KepalaHalaman
        judul="Tambah anggota"
        keterangan="Untuk menambah satu-dua orang di tengah periode. Pemuatan daftar sekaligus di awal periode lebih baik lewat data/seed-data.csv."
        aksi={
          <Link href="/anggota" className="text-sm text-utama underline underline-offset-4">
            ← Kembali ke daftar
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Data anggota baru</CardTitle>
          <CardDescription>
            Program studi, fakultas, dan angkatan akan diturunkan dari NPM bila dikosongkan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormulirAnggota
            aksi={buatAnggota}
            labelTombol="Simpan anggota"
            bolehUbahPeran={bolehTulis(pengguna.role, "peran_hak_akses")}
            squad={squad}
            peran={Object.entries(LABEL_PERAN).map(([nilai, label]) => ({ nilai, label }))}
            nilai={{
              nama: "",
              npm: "",
              email: "",
              prodi: "",
              fakultas: "Teknik",
              angkatan: "",
              semester: "",
              squadId: "",
              jenjang: "MUDA",
              status: "AKTIF",
              role: "ANGGOTA",
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
