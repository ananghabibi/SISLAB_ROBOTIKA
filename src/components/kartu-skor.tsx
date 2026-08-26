import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { RekapAnggota } from "@/lib/kontribusi";

function Batang({ label, nilai, maksimal }: { label: string; nilai: number; maksimal: number }) {
  const persen = maksimal > 0 ? Math.min(100, (nilai / maksimal) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium tabular-nums">
          {nilai} <span className="text-teks-redup">/ {maksimal}</span>
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-dasar">
        <div className="h-full rounded-full bg-utama" style={{ width: `${persen}%` }} />
      </div>
    </div>
  );
}

/**
 * Kartu skor kontribusi seorang anggota.
 *
 * Menampilkan rincian per komponen, bukan hanya angka akhirnya. Salah satu
 * ukuran keberhasilan sistem ini adalah anggota dapat melihat sendiri berapa
 * skornya dan apa yang kurang, tanpa perlu bertanya kepada siapa pun
 * (SPEC bagian 11 butir 3) — angka tunggal tidak memenuhi itu.
 */
export function KartuSkor({
  rekap,
  ambangLulus,
  judul = "Skor kontribusi Anda",
}: {
  rekap: RekapAnggota;
  ambangLulus: number;
  judul?: string;
}) {
  const { rincian, komponen, kekurangan, totalJam } = rekap;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{judul}</CardTitle>
            <CardDescription>
              Ambang kelulusan periode ini {ambangLulus}. Dihitung ulang setiap halaman dibuka.
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold tabular-nums text-utama">{rincian.skor}</p>
            <Badge variant={rincian.lulus ? "berhasil" : "peringatan"}>
              {rincian.lulus ? "Memenuhi ambang" : "Belum memenuhi"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <Batang label="Kehadiran" nilai={rincian.nilaiHadir} maksimal={40} />
        <Batang label="Sesi berbagi" nilai={rincian.nilaiSesiBerbagi} maksimal={20} />
        <Batang label="Piket" nilai={rincian.nilaiPiket} maksimal={20} />
        <Batang label="Logbook squad" nilai={rincian.nilaiLogbook} maksimal={20} />

        {rincian.penguranganAlat < 0 ? (
          <p className="rounded-lg bg-bahaya-lembut px-3 py-2 text-sm text-bahaya">
            <strong>{rincian.penguranganAlat} poin</strong> karena{" "}
            {komponen.alatBelumKembali} alat belum dikembalikan. Kembalikan alatnya dan poin ini
            hilang dengan sendirinya.
          </p>
        ) : null}

        <p className="text-sm text-teks-redup">
          {komponen.hariHadir} hari hadir · {totalJam} jam tercatat
        </p>

        {kekurangan.length > 0 ? (
          <div className="rounded-lg bg-utama-lembut px-3 py-3">
            <p className="text-sm font-semibold text-utama">Yang masih kurang</p>
            <ul className="mt-1 space-y-0.5 text-sm text-utama">
              {kekurangan.map((k) => (
                <li key={k.label}>
                  {k.label}: kurang <strong>{k.kurang}</strong> {k.satuan} lagi (
                  {k.tercapai} dari {k.target})
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="rounded-lg bg-berhasil-lembut px-3 py-2 text-sm text-berhasil">
            Seluruh target periode ini sudah Anda penuhi.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
