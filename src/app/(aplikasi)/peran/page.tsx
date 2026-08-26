import Link from "next/link";

import { KepalaHalaman } from "@/components/kepala-halaman";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { wajibIzin } from "@/lib/penjaga";
import { prisma } from "@/lib/prisma";
import { LABEL_MODUL, LABEL_PERAN, MATRIKS_AKSES, MODUL, type Izin } from "@/lib/rbac";

export const metadata = { title: "Peran & Hak Akses" };

const PERAN_URUT = [
  "KEPALA_LAB",
  "KOORD_OPERASIONAL",
  "KOORD_RISET",
  "KOORD_PENGEMBANGAN",
  "KETUA_SQUAD",
  "ANGGOTA",
  "PENGAWAS",
] as const;

/** Menerjemahkan izin menjadi legenda SPEC: B, Bs, T, H, —. */
function tanda(izin: Izin): { teks: string; judul: string } {
  const bagian: string[] = [];
  if (izin.baca === "SEMUA") bagian.push("B");
  else if (izin.baca === "SENDIRI") bagian.push("Bs");
  if (izin.tulis !== "TIDAK") bagian.push("T");
  if (izin.hapus) bagian.push("H");
  if (bagian.length === 0) return { teks: "—", judul: "Tidak ada akses" };

  const judul = [
    izin.baca === "SEMUA" ? "baca semua" : izin.baca === "SENDIRI" ? "baca miliknya/squadnya" : null,
    izin.tulis === "SEMUA" ? "tulis semua" : izin.tulis === "SENDIRI" ? "tulis miliknya/squadnya" : null,
    izin.hapus ? "hapus" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return { teks: bagian.join(", "), judul };
}

export default async function HalamanPeran() {
  await wajibIzin("peran_hak_akses", "tulis");

  const perPeran = await prisma.user.groupBy({ by: ["role"], _count: true });
  const jumlah = new Map(perPeran.map((p) => [p.role, p._count]));

  return (
    <>
      <KepalaHalaman
        judul="Peran & Hak Akses"
        keterangan="Kebijakan akses laboratorium, sebagaimana dijalankan sistem. Tabel ini dibaca langsung dari kode yang menegakkannya, bukan disalin ulang."
      />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Jumlah pemegang peran</CardTitle>
          <CardDescription>
            Untuk mengubah peran seseorang, buka halaman anggota yang bersangkutan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {PERAN_URUT.map((p) => (
              <li key={p} className="flex items-center justify-between rounded-lg bg-dasar px-3 py-2">
                <Link
                  href={`/anggota?peran=${p}`}
                  className="text-sm text-utama underline-offset-4 hover:underline"
                >
                  {LABEL_PERAN[p]}
                </Link>
                <span className="text-sm font-semibold">{jumlah.get(p) ?? 0}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Matriks hak akses</CardTitle>
          <CardDescription>
            B = baca semua · Bs = baca miliknya/squadnya · T = tulis · H = hapus · — = tidak ada
            akses
          </CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-garis bg-dasar text-left">
              <tr>
                <th className="px-3 py-2 font-semibold">Modul</th>
                {PERAN_URUT.map((p) => (
                  <th key={p} className="px-3 py-2 text-center font-semibold whitespace-nowrap">
                    {LABEL_PERAN[p].replace("Koordinator ", "Koord. ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODUL.map((modul) => (
                <tr key={modul} className="border-b border-garis last:border-0">
                  <td className="px-3 py-2 font-medium whitespace-nowrap">{LABEL_MODUL[modul]}</td>
                  {PERAN_URUT.map((peran) => {
                    const t = tanda(MATRIKS_AKSES[modul][peran]);
                    return (
                      <td
                        key={peran}
                        title={t.judul}
                        className={`px-3 py-2 text-center font-mono text-xs ${
                          t.teks === "—" ? "text-teks-redup" : "font-semibold text-utama"
                        }`}
                      >
                        {t.teks}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <CardContent>
          <ul className="list-disc space-y-1 pl-5 text-sm text-teks-redup">
            <li>
              Hanya Kepala Laboratorium yang dapat menerbitkan Surat Keterangan Kontribusi. Surat itu
              pernyataan pribadi dosen kepada Program Studi.
            </li>
            <li>
              Tidak ada peran mana pun yang boleh mengubah atau menghapus catatan absensi yang sudah
              masuk. Koreksi dilakukan lewat catatan pembatalan yang merujuk catatan asli.
            </li>
            <li>Pengawas tidak pernah punya akses tulis sama sekali.</li>
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
