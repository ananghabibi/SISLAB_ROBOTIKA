import { notFound } from "next/navigation";

import { KepalaHalaman } from "@/components/kepala-halaman";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { bolehLihatDataOrang, tolakAkses, wajibIzin } from "@/lib/penjaga";
import { prisma } from "@/lib/prisma";
import { bolehTulis, LABEL_PERAN, PERAN_DIKELOLA, peranDapatDiberi } from "@/lib/rbac";
import { sandiBawaan } from "@/lib/sandi";
import { FormulirAnggota } from "../formulir-anggota";
import { simpanAnggota } from "../aksi";
import { TombolSetelUlangSandi } from "./tombol-setel-ulang";

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
  // Peran boleh diubah bila pengelola berwenang atas peran akun INI. Kepala
  // Laboratorium selalu boleh; pengelola keanggotaan lain hanya untuk akun yang
  // perannya masih dalam jangkauannya (Anggota atau Ketua Squad), tidak untuk
  // akun yang sudah menjadi koordinator ke atas.
  const bolehUbahPeran =
    bolehTulis(pengguna.role, "peran_hak_akses") ||
    (bolehTulis(pengguna.role, "master_anggota") && PERAN_DIKELOLA.includes(anggota.role));
  // Pilihan peran dibatasi menurut wewenang; peran akun kini selalu disertakan
  // agar nilainya tetap tampil walau di luar jangkauan (kendalinya nonaktif).
  const opsiPeran = new Set(peranDapatDiberi(pengguna.role));
  opsiPeran.add(anggota.role);
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
        kembali={{ href: "/anggota", label: "Kembali ke daftar anggota" }}
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
              peran={[...opsiPeran].map((nilai) => ({ nilai, label: LABEL_PERAN[nilai] }))}
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

      {bolehSunting ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              Akses masuk
              {anggota.wajibGantiSandi ? (
                <Badge variant="peringatan">Masih kata sandi bawaan</Badge>
              ) : (
                <Badge variant="berhasil">Kata sandi sendiri</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {anggota.wajibGantiSandi
                ? "Sampai kata sandinya diganti sendiri, akun ini hanya membuka Dasbor dan Profil. Absensi belum dapat dicatat dengan akun ini."
                : "Anggota ini sudah memilih kata sandinya sendiri, dan hanya dia yang mengetahuinya."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {anggota.wajibGantiSandi ? (
              <div className="rounded-lg bg-dasar px-3 py-2">
                <p className="text-xs text-teks-redup">Kata sandi bawaan yang perlu diserahkan</p>
                <p className="mt-1 font-mono text-sm font-semibold break-all">{sandiBawaan()}</p>
              </div>
            ) : null}

            <div>
              <TombolSetelUlangSandi idAnggota={anggota.id} />
              <p className="mt-2 text-xs text-teks-redup">
                Untuk anggota yang lupa kata sandinya. Akunnya kembali ke kata sandi bawaan dan
                kembali terkunci pada Dasbor dan Profil sampai dia memilih kata sandi baru.
                Penyetelan ulang tercatat di audit log.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
