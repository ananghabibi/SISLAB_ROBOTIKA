import Link from "next/link";
import { notFound } from "next/navigation";

import { KepalaHalaman } from "@/components/kepala-halaman";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { bolehLihatDataOrang, tolakAkses, wajibIzin } from "@/lib/penjaga";
import { prisma } from "@/lib/prisma";
import { bolehTulis, LABEL_PERAN } from "@/lib/rbac";
import { FormulirAnggota } from "../formulir-anggota";
import { simpanAnggota } from "../aksi";

export const metadata = { title: "Detail anggota" };

export default async function DetailAnggota({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { pengguna } = await wajibIzin("master_anggota", "baca");

  const anggota = await prisma.user.findUnique({
    where: { id },
    include: { squad: { select: { id: true, nama: true } } },
  });
  if (!anggota) notFound();

  // Lingkup baca diperiksa per baris, bukan hanya per rute: tanpa ini seseorang
  // bisa menebak id anggota lain dan membuka datanya lewat URL.
  if (!bolehLihatDataOrang(pengguna, "master_anggota", anggota) && anggota.squadId !== pengguna.squadId) {
    tolakAkses();
  }

  const bolehSunting = bolehTulis(pengguna.role, "master_anggota");
  const bolehUbahPeran = bolehTulis(pengguna.role, "peran_hak_akses");
  const squad = await prisma.squad.findMany({
    orderBy: { nama: "asc" },
    select: { id: true, nama: true },
  });

  const simpan = simpanAnggota.bind(null, anggota.id);

  return (
    <>
      <KepalaHalaman
        judul={anggota.nama}
        keterangan={`${LABEL_PERAN[anggota.role]}${anggota.squad ? ` · ${anggota.squad.nama}` : ""}`}
        aksi={
          <Link href="/anggota" className="text-sm text-utama underline underline-offset-4">
            ← Kembali ke daftar
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{bolehSunting ? "Ubah data anggota" : "Data anggota"}</CardTitle>
          <CardDescription>
            {bolehSunting
              ? "Setiap perubahan tercatat di audit log beserta nilai lama dan barunya."
              : "Peran Anda hanya berhak membaca data ini."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bolehSunting ? (
            <FormulirAnggota
              aksi={simpan}
              labelTombol="Simpan perubahan"
              bolehUbahPeran={bolehUbahPeran}
              squad={squad}
              peran={Object.entries(LABEL_PERAN).map(([nilai, label]) => ({ nilai, label }))}
              nilai={{
                nama: anggota.nama,
                npm: anggota.npm ?? "",
                email: anggota.email,
                prodi: anggota.prodi,
                fakultas: anggota.fakultas,
                angkatan: anggota.angkatan?.toString() ?? "",
                semester: anggota.semester?.toString() ?? "",
                squadId: anggota.squadId ?? "",
                jenjang: anggota.jenjang,
                status: anggota.status,
                role: anggota.role,
              }}
            />
          ) : (
            <dl className="grid gap-2 sm:grid-cols-2">
              {[
                ["NPM", anggota.npm ?? "—"],
                ["Surel", anggota.email],
                ["Program studi", anggota.prodi],
                ["Fakultas", anggota.fakultas],
                ["Angkatan", anggota.angkatan?.toString() ?? "—"],
                ["Semester", anggota.semester?.toString() ?? "—"],
                ["Squad", anggota.squad?.nama ?? "—"],
                ["Jenjang", anggota.jenjang],
                ["Status", anggota.status],
              ].map(([label, nilai]) => (
                <div key={label}>
                  <dt className="text-xs text-teks-redup">{label}</dt>
                  <dd className="text-sm font-medium">{nilai}</dd>
                </div>
              ))}
            </dl>
          )}
        </CardContent>
      </Card>
    </>
  );
}
