import { Rintisan } from "@/components/rintisan";
import { wajibIzin } from "@/lib/penjaga";

export const metadata = { title: "Peminjaman" };

export default async function Halaman() {
  await wajibIzin("peminjaman", "baca");
  return <Rintisan judul="Peminjaman" milestone={4} isi="Peminjaman dan pengembalian alat lewat pemindaian QR aset." />;
}
