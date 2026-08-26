import Link from "next/link";
import type { Prisma } from "@prisma/client";

import { KepalaHalaman } from "@/components/kepala-halaman";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { saringanDaftarAnggota, wajibIzin } from "@/lib/penjaga";
import { prisma } from "@/lib/prisma";
import { bolehBacaSemua, bolehTulis, LABEL_PERAN } from "@/lib/rbac";

export const metadata = { title: "Anggota" };

const WARNA_STATUS = {
  AKTIF: "berhasil",
  CUTI: "peringatan",
  NONAKTIF: "netral",
  LULUS: "utama",
} as const;

export default async function DaftarAnggota({
  searchParams,
}: {
  searchParams: Promise<{ cari?: string; squad?: string; peran?: string; status?: string }>;
}) {
  const { pengguna } = await wajibIzin("master_anggota", "baca");
  const filter = await searchParams;

  const lingkup = saringanDaftarAnggota(pengguna) as Prisma.UserWhereInput;
  const where: Prisma.UserWhereInput = {
    ...lingkup,
    ...(filter.cari
      ? {
          OR: [
            { nama: { contains: filter.cari, mode: "insensitive" } },
            { npm: { contains: filter.cari } },
            { email: { contains: filter.cari, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(filter.squad ? { squadId: filter.squad } : {}),
    ...(filter.peran ? { role: filter.peran as never } : {}),
    ...(filter.status ? { status: filter.status as never } : {}),
  };

  const [anggota, squad] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ role: "asc" }, { nama: "asc" }],
      include: { squad: { select: { nama: true } } },
    }),
    prisma.squad.findMany({ orderBy: { nama: "asc" }, select: { id: true, nama: true } }),
  ]);

  const lihatSemua = bolehBacaSemua(pengguna.role, "master_anggota");
  const bolehSunting = bolehTulis(pengguna.role, "master_anggota");

  return (
    <>
      <KepalaHalaman
        judul="Anggota"
        keterangan={
          lihatSemua
            ? `${anggota.length} anggota tercatat.`
            : "Anda melihat anggota dalam lingkup squad Anda saja."
        }
        aksi={
          bolehSunting ? (
            <Link href="/anggota/baru">
              <Button>Tambah anggota</Button>
            </Link>
          ) : null
        }
      />

      <Card className="mb-4">
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input name="cari" placeholder="Cari nama, NPM, atau surel" defaultValue={filter.cari} />
            <Select name="squad" defaultValue={filter.squad ?? ""}>
              <option value="">Semua squad</option>
              {squad.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama}
                </option>
              ))}
            </Select>
            <Select name="peran" defaultValue={filter.peran ?? ""}>
              <option value="">Semua peran</option>
              {Object.entries(LABEL_PERAN).map(([nilai, label]) => (
                <option key={nilai} value={nilai}>
                  {label}
                </option>
              ))}
            </Select>
            <div className="flex gap-2">
              <Select name="status" defaultValue={filter.status ?? ""} className="flex-1">
                <option value="">Semua status</option>
                {["AKTIF", "CUTI", "NONAKTIF", "LULUS"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
              <Button type="submit" variant="garis">
                Saring
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {anggota.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-sm text-teks-redup">Tidak ada anggota yang cocok dengan saringan.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-garis bg-dasar text-left">
                <tr>
                  <th className="px-4 py-2 font-semibold">Nama</th>
                  <th className="px-4 py-2 font-semibold">NPM</th>
                  <th className="hidden px-4 py-2 font-semibold sm:table-cell">Squad</th>
                  <th className="hidden px-4 py-2 font-semibold md:table-cell">Peran</th>
                  <th className="hidden px-4 py-2 font-semibold lg:table-cell">Jenjang</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {anggota.map((a) => (
                  <tr key={a.id} className="border-b border-garis last:border-0">
                    <td className="px-4 py-2">
                      <Link
                        href={`/anggota/${a.id}`}
                        className="font-medium text-utama underline-offset-4 hover:underline"
                      >
                        {a.nama}
                      </Link>
                      <p className="text-xs text-teks-redup">
                        {a.prodi}
                        {a.fakultas !== "Teknik" ? ` · ${a.fakultas}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{a.npm ?? "—"}</td>
                    <td className="hidden px-4 py-2 sm:table-cell">{a.squad?.nama ?? "—"}</td>
                    <td className="hidden px-4 py-2 md:table-cell">{LABEL_PERAN[a.role]}</td>
                    <td className="hidden px-4 py-2 lg:table-cell">{a.jenjang}</td>
                    <td className="px-4 py-2">
                      <Badge variant={WARNA_STATUS[a.status]}>{a.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
