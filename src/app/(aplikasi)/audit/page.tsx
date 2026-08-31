import type { Prisma } from "@prisma/client";

import { KepalaHalaman } from "@/components/kepala-halaman";
import { Badge } from "@/components/ui/badge";
import { Button, TautanTombol } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saringanAuditLog, wajibIzin } from "@/lib/penjaga";
import { prisma } from "@/lib/prisma";
import { tanggalDanJamWib } from "@/lib/waktu";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit Log" };

/** Sebanyak ini per halaman; jejak audit tumbuh terus dan tidak boleh dimuat sekaligus. */
const PER_HALAMAN = 60;

export default async function Halaman({
  searchParams,
}: {
  searchParams: Promise<{ aksi?: string; entitas?: string; q?: string; hlm?: string }>;
}) {
  const { pengguna } = await wajibIzin("audit_log", "baca");
  const saringan = await searchParams;

  const halaman = Math.max(1, Number(saringan.hlm ?? "1") || 1);
  const lingkup = saringanAuditLog(pengguna) as Prisma.AuditLogWhereInput;

  const where: Prisma.AuditLogWhereInput = {
    ...lingkup,
    ...(saringan.aksi ? { aksi: saringan.aksi } : {}),
    ...(saringan.entitas ? { entitas: saringan.entitas } : {}),
    ...(saringan.q
      ? {
          OR: [
            { entitasId: { contains: saringan.q, mode: "insensitive" } },
            { user: { nama: { contains: saringan.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [jejak, jumlah, aksiTersedia, entitasTersedia] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { nama: true } } },
      orderBy: { createdAt: "desc" },
      skip: (halaman - 1) * PER_HALAMAN,
      take: PER_HALAMAN,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.groupBy({ by: ["aksi"], where: lingkup, orderBy: { aksi: "asc" } }),
    prisma.auditLog.groupBy({ by: ["entitas"], where: lingkup, orderBy: { entitas: "asc" } }),
  ]);

  const halamanTerakhir = Math.max(1, Math.ceil(jumlah / PER_HALAMAN));
  const tautan = (ubah: Record<string, string>) => {
    const p = new URLSearchParams();
    if (saringan.aksi) p.set("aksi", saringan.aksi);
    if (saringan.entitas) p.set("entitas", saringan.entitas);
    if (saringan.q) p.set("q", saringan.q);
    for (const [k, v] of Object.entries(ubah)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const teks = p.toString();
    return teks ? `/audit?${teks}` : "/audit";
  };

  return (
    <>
      <KepalaHalaman
        judul="Audit Log"
        keterangan={`${jumlah} jejak tercatat${pengguna.role === "KEPALA_LAB" ? "" : " (tindakan Anda sendiri)"}`}
      />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Saringan</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Formulir GET biasa: jejak audit harus dapat ditautkan apa adanya,
              supaya satu tautan cukup untuk menunjukkan hal yang sama kepada
              orang lain saat audit Program Studi. */}
          <form method="get" className="grid gap-3 sm:grid-cols-4">
            <Field label="Aksi" htmlFor="saringan-aksi">
              <Select id="saringan-aksi" name="aksi" defaultValue={saringan.aksi ?? ""}>
                <option value="">Semua aksi</option>
                {aksiTersedia.map((a) => (
                  <option key={a.aksi} value={a.aksi}>
                    {a.aksi}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Entitas" htmlFor="saringan-entitas">
              <Select id="saringan-entitas" name="entitas" defaultValue={saringan.entitas ?? ""}>
                <option value="">Semua entitas</option>
                {entitasTersedia.map((e) => (
                  <option key={e.entitas} value={e.entitas}>
                    {e.entitas}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="sm:col-span-2">
              <Field label="Cari" htmlFor="saringan-q" petunjuk="Nama pelaku atau id entitas.">
                <Input
                  id="saringan-q"
                  name="q"
                  type="search"
                  defaultValue={saringan.q ?? ""}
                  placeholder="mis. Anang, atau id catatan"
                />
              </Field>
            </div>

            <div className="flex flex-wrap gap-2 sm:col-span-4">
              <Button type="submit">Terapkan</Button>
              {saringan.aksi || saringan.entitas || saringan.q ? (
                <TautanTombol href="/audit" variant="garis">
                  Bersihkan saringan
                </TautanTombol>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {jejak.length === 0 ? (
            <p className="py-10 text-center text-sm text-teks-redup">
              Tidak ada jejak yang cocok dengan saringan ini.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] text-left text-sm">
                <thead className="border-b border-garis bg-dasar">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Waktu</th>
                    <th className="px-4 py-2 font-semibold">Pelaku</th>
                    <th className="px-4 py-2 font-semibold">Aksi</th>
                    <th className="px-4 py-2 font-semibold">Entitas</th>
                    <th className="hidden px-4 py-2 font-semibold md:table-cell">Alamat</th>
                  </tr>
                </thead>
                <tbody>
                  {jejak.map((j) => (
                    <tr key={j.id} className="border-b border-garis last:border-0">
                      <td className="px-4 py-2 whitespace-nowrap">
                        {tanggalDanJamWib(j.createdAt)}
                      </td>
                      <td className="px-4 py-2">{j.user?.nama ?? "—"}</td>
                      <td className="px-4 py-2">
                        <Badge variant="netral">{j.aksi}</Badge>
                      </td>
                      <td className="px-4 py-2">
                        <span className="font-medium">{j.entitas}</span>
                        {j.entitasId ? (
                          <span className="block text-xs text-teks-redup">{j.entitasId}</span>
                        ) : null}
                      </td>
                      <td className="hidden px-4 py-2 text-teks-redup md:table-cell">
                        {j.ip ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {halamanTerakhir > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm">
          {halaman > 1 ? (
            <TautanTombol href={tautan({ hlm: String(halaman - 1) })} variant="garis">
              ← Sebelumnya
            </TautanTombol>
          ) : (
            <span aria-hidden="true" />
          )}
          <span className="text-teks-redup">
            Halaman {halaman} dari {halamanTerakhir}
          </span>
          {halaman < halamanTerakhir ? (
            <TautanTombol href={tautan({ hlm: String(halaman + 1) })} variant="garis">
              Berikutnya →
            </TautanTombol>
          ) : (
            <span aria-hidden="true" />
          )}
        </div>
      ) : null}
    </>
  );
}
