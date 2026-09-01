import { KepalaHalaman } from "@/components/kepala-halaman";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { wajibMasuk } from "@/lib/penjaga";
import { prisma } from "@/lib/prisma";
import { LABEL_PERAN } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { tanggalDanJamWib } from "@/lib/waktu";
import { FormulirSandi } from "./formulir-sandi";

export const metadata = { title: "Profil" };

function Baris({ label, nilai }: { label: string; nilai: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-garis py-2 last:border-0">
      <dt className="text-sm text-teks-redup">{label}</dt>
      <dd className="text-right text-sm font-medium">{nilai}</dd>
    </div>
  );
}

export default async function Profil() {
  const sesi = await wajibMasuk();

  const anggota = await prisma.user.findUniqueOrThrow({
    where: { id: sesi.id },
    include: { squad: { select: { nama: true, kode: true } } },
  });

  const punyaSandi = Boolean(anggota.passwordHash);
  const luarTeknik = anggota.fakultas !== "Teknik";
  const masihBawaan = anggota.wajibGantiSandi;

  return (
    <>
      <KepalaHalaman
        judul="Profil saya"
        keterangan="Data ini berasal dari SK Keanggotaan. Perubahan hanya dapat dilakukan Kepala Laboratorium, Koordinator Operasional, atau Koordinator Pengembangan."
      />

      {masihBawaan ? (
        <Card className="mb-4 border-peringatan/50 bg-peringatan-lembut/50">
          <CardHeader className="border-peringatan/30">
            <CardTitle className="text-peringatan">Ganti kata sandi bawaan dulu</CardTitle>
            <CardDescription className="text-peringatan">
              Akun ini masih memakai kata sandi bawaan, dan kata sandi itu sama untuk setiap akun
              baru. Selama masih terpasang, hanya Dasbor dan halaman ini yang terbuka — absensi dan
              seluruh menu lain menunggu sampai Anda memilih kata sandi sendiri di bawah.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {/* Saat kata sandi bawaan masih terpasang, kartu keamanan naik ke atas:
          satu-satunya hal yang dapat dilakukan di halaman ini adalah menggantinya. */}
      <div className={cn("grid gap-4 lg:grid-cols-2", masihBawaan && "[&>*:last-child]:order-first")}>
        <Card>
          <CardHeader>
            <CardTitle>{anggota.nama}</CardTitle>
            <CardDescription>{anggota.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <dl>
              <Baris label="NPM" nilai={anggota.npm ?? "—"} />
              <Baris label="Program studi" nilai={anggota.prodi} />
              <Baris
                label="Fakultas"
                nilai={
                  <span className="inline-flex items-center gap-2">
                    {anggota.fakultas}
                    {luarTeknik ? <Badge variant="peringatan">Afiliasi</Badge> : null}
                  </span>
                }
              />
              <Baris label="Angkatan" nilai={anggota.angkatan ?? "—"} />
              <Baris label="Semester" nilai={anggota.semester ?? "—"} />
              <Baris label="Squad" nilai={anggota.squad?.nama ?? "Tanpa squad"} />
              <Baris label="Peran" nilai={LABEL_PERAN[anggota.role]} />
              <Baris label="Jenjang" nilai={anggota.jenjang} />
              <Baris
                label="Status"
                nilai={
                  <Badge variant={anggota.status === "AKTIF" ? "berhasil" : "peringatan"}>
                    {anggota.status}
                  </Badge>
                }
              />
              <Baris label="Terdaftar" nilai={tanggalDanJamWib(anggota.createdAt)} />
            </dl>

            {luarTeknik ? (
              <p className="mt-4 rounded-lg bg-peringatan-lembut px-3 py-2 text-xs text-peringatan">
                Anda tercatat sebagai Anggota Afiliasi dari luar Fakultas Teknik. Kontribusi Anda
                dihitung sama persis, tetapi pengakuan U-Point mengikuti ketentuan fakultas asal.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Keamanan akun</CardTitle>
            <CardDescription>
              {!punyaSandi
                ? "Akun ini masuk lewat Google kampus, sehingga tidak memiliki kata sandi sendiri."
                : masihBawaan
                  ? "Pilih kata sandi Anda sendiri. Isikan kata sandi bawaan yang Anda terima pada kolom pertama."
                  : "Kata sandi hanya diketahui Anda sendiri. Gantilah bila pernah diketikkan di komputer bersama."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {punyaSandi ? (
              <FormulirSandi />
            ) : (
              <p className="text-sm text-teks-redup">
                Keamanan akun Anda mengikuti akun Google kampus. Aktifkan verifikasi dua langkah di
                pengaturan akun Google.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
