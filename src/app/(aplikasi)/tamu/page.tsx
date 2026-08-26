import { Rintisan } from "@/components/rintisan";
import { wajibIzin } from "@/lib/penjaga";

export const metadata = { title: "Buku Tamu" };

export default async function Halaman() {
  await wajibIzin("insiden", "baca");
  return <Rintisan judul="Buku Tamu" milestone={5} isi="Pencatatan tamu, dosen lain, dan mahasiswa non-anggota." />;
}
