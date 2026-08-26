import { forbidden } from "next/navigation";

/**
 * Tujuan penulisan ulang dari middleware saat sebuah rute bukan hak akses
 * peran yang bersangkutan.
 *
 * Satu-satunya tugasnya memicu `forbidden()`, supaya jawabannya benar-benar
 * berstatus 403 dan tampilannya memakai `src/app/forbidden.tsx` yang sama
 * dengan penolakan dari penjagaan di dalam halaman. `NextResponse.rewrite()`
 * sendiri mengabaikan opsi status, jadi status harus datang dari sini.
 */
export default function HalamanTigaNolTiga(): never {
  forbidden();
}
