import { Navigasi } from "@/components/navigasi";
import { TombolKeluar } from "@/components/tombol-keluar";
import { kelompokMenu } from "@/lib/menu";
import { wajibMasuk } from "@/lib/penjaga";
import { LABEL_PERAN } from "@/lib/rbac";

export default async function TataLetakAplikasi({ children }: { children: React.ReactNode }) {
  const pengguna = await wajibMasuk();

  return (
    <div className="lg:flex">
      <Navigasi
        kelompok={kelompokMenu(pengguna.role)}
        nama={pengguna.nama}
        peran={LABEL_PERAN[pengguna.role]}
        squad={pengguna.squadNama}
        tombolKeluar={<TombolKeluar />}
      />
      <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:py-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
