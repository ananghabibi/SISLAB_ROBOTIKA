import { Rintisan } from "@/components/rintisan";
import { wajibIzin } from "@/lib/penjaga";

export const metadata = { title: "Ekspor Data" };

export default async function Halaman() {
  await wajibIzin("ekspor", "baca");
  return <Rintisan judul="Ekspor Data" milestone={3} isi="Ekspor CSV dan PDF rekap untuk diserahkan ke Program Studi." />;
}
