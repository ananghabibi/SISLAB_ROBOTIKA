import Link from "next/link";

import { KepalaHalaman } from "@/components/kepala-halaman";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { menuUntukPeran } from "@/lib/menu";
import { wajibMasuk } from "@/lib/penjaga";
import { prisma } from "@/lib/prisma";
import { bolehBacaSemua, LABEL_PERAN } from "@/lib/rbac";
import { tanggalPendekWib } from "@/lib/waktu";

export const metadata = { title: "Dasbor" };

export default async function Dasbor() {
  const pengguna = await wajibMasuk();
  const lihatSemuaAnggota = bolehBacaSemua(pengguna.role, "master_anggota");

  const [periode, jumlahAnggota, jumlahSquad, temanSquad] = await Promise.all([
    prisma.period.findFirst({ where: { aktif: true } }),
    lihatSemuaAnggota ? prisma.user.count({ where: { status: "AKTIF" } }) : Promise.resolve(null),
    lihatSemuaAnggota ? prisma.squad.count() : Promise.resolve(null),
    pengguna.squadId
      ? prisma.user.count({ where: { squadId: pengguna.squadId, status: "AKTIF" } })
      : Promise.resolve(null),
  ]);

  const menu = menuUntukPeran(pengguna.role);

  return (
    <>
      <KepalaHalaman
        judul={`Selamat datang, ${pengguna.nama.split(" ")[0]}`}
        keterangan={`${LABEL_PERAN[pengguna.role]}${pengguna.squadNama ? ` · ${pengguna.squadNama}` : ""}`}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Periode berjalan</CardTitle>
          </CardHeader>
          <CardContent>
            {periode ? (
              <>
                <p className="font-semibold">{periode.nama}</p>
                <p className="mt-1 text-sm text-teks-redup">
                  {tanggalPendekWib(periode.tanggalMulai)} – {tanggalPendekWib(periode.tanggalSelesai)}
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-teks-redup">Target hadir</dt>
                    <dd className="font-semibold">{periode.targetHadir} hari</dd>
                  </div>
                  <div>
                    <dt className="text-teks-redup">Ambang lulus</dt>
                    <dd className="font-semibold">{periode.ambangLulus}</dd>
                  </div>
                  <div>
                    <dt className="text-teks-redup">Target piket</dt>
                    <dd className="font-semibold">{periode.targetPiket}×</dd>
                  </div>
                  <div>
                    <dt className="text-teks-redup">Target logbook</dt>
                    <dd className="font-semibold">{periode.targetLogbook} entri</dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className="text-sm text-teks-redup">
                Belum ada periode aktif. Kepala Laboratorium dapat membuatnya di menu Periode &amp;
                Target.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ringkasan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {jumlahAnggota !== null ? (
              <p>
                <span className="font-semibold">{jumlahAnggota}</span> anggota aktif dalam{" "}
                <span className="font-semibold">{jumlahSquad}</span> squad.
              </p>
            ) : null}
            {temanSquad !== null ? (
              <p>
                Squad Anda beranggotakan <span className="font-semibold">{temanSquad}</span> orang
                aktif.
              </p>
            ) : null}
            <p className="text-teks-redup">
              NPM {pengguna.npm ?? "—"} · {pengguna.fakultas}
            </p>
            <p>
              <Link href="/profil" className="text-utama underline underline-offset-4">
                Lihat profil lengkap
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Menu yang tersedia untuk peran Anda</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-wrap gap-2">
            {menu.map((butir) => (
              <li key={butir.href}>
                <Link href={butir.href}>
                  <Badge variant={butir.milestone === 1 ? "berhasil" : "netral"}>
                    {butir.label}
                    {butir.milestone > 1 ? ` · M${butir.milestone}` : ""}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-teks-redup">
            Bertanda hijau sudah berfungsi. Sisanya sudah punya rute dan hak akses, isinya menyusul
            pada milestone yang tertera.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
