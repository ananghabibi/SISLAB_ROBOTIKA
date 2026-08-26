import { Rintisan } from "@/components/rintisan";
import { wajibIzin } from "@/lib/penjaga";

export const metadata = { title: "Periode & Target" };

export default async function Halaman() {
  await wajibIzin("periode_target", "tulis");
  return <Rintisan judul="Periode & Target" milestone={3} isi="Pengaturan periode, target, dan ambang kelulusan skor kontribusi." />;
}
