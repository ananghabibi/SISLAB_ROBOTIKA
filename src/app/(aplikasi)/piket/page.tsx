import { Rintisan } from "@/components/rintisan";
import { wajibIzin } from "@/lib/penjaga";

export const metadata = { title: "Piket" };

export default async function Halaman() {
  await wajibIzin("piket", "baca");
  return <Rintisan judul="Piket" milestone={5} isi="Jadwal piket dan checklist delapan butir dengan foto sebelum-sesudah." />;
}
