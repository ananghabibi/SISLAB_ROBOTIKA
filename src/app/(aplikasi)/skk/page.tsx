import { Rintisan } from "@/components/rintisan";
import { wajibIzin } from "@/lib/penjaga";

export const metadata = { title: "Surat Kontribusi" };

export default async function Halaman() {
  await wajibIzin("skk", "baca");
  return <Rintisan judul="Surat Kontribusi" milestone={6} isi="Daftar kandidat dan penerbitan Surat Keterangan Kontribusi." />;
}
