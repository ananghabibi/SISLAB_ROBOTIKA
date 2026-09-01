"use server";

import { AuthError } from "next-auth";

import { signIn, signOut } from "@/auth";
import { ipPemohon } from "@/lib/audit";
import { periksaLajuMasuk } from "@/lib/pembatas-laju";

export interface KeadaanMasuk {
  galat?: string;
}

/**
 * Next.js memberi tanda pengalihan dengan cara melempar. Lemparan itu harus
 * diteruskan apa adanya, bukan ditangkap sebagai kegagalan masuk.
 */
function pengalihanNext(galat: unknown): boolean {
  return (
    typeof galat === "object" &&
    galat !== null &&
    "digest" in galat &&
    typeof (galat as { digest?: unknown }).digest === "string" &&
    (galat as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

/** Masuk lewat Google kampus. */
export async function masukGoogle(_keadaan: KeadaanMasuk, data: FormData): Promise<KeadaanMasuk> {
  const lanjut = (data.get("lanjut") as string) || "/dasbor";
  await signIn("google", { redirectTo: lanjut });
  return {};
}

/** Masuk lewat surel + kata sandi (akun dosen). */
export async function masukKredensial(
  _keadaan: KeadaanMasuk,
  data: FormData,
): Promise<KeadaanMasuk> {
  const email = String(data.get("email") ?? "").trim();
  const password = String(data.get("password") ?? "");
  const lanjut = (data.get("lanjut") as string) || "/dasbor";

  if (!email || !password) {
    return { galat: "Surel dan kata sandi wajib diisi." };
  }

  // Diperiksa SEBELUM kata sandinya dicocokkan. Memeriksa sesudahnya berarti
  // setiap percobaan tetap membebani pencocokan bcrypt, dan pembatas ini
  // berubah menjadi pesan sopan yang tidak menghentikan apa pun.
  const ditolak = periksaLajuMasuk(await ipPemohon(), email);
  if (ditolak) return { galat: ditolak };

  try {
    await signIn("credentials", { email, password, redirectTo: lanjut });
    return {};
  } catch (galat) {
    if (pengalihanNext(galat)) throw galat;
    if (galat instanceof AuthError) {
      // Pesan sengaja tidak membedakan "surel tidak ada" dari "kata sandi salah".
      return { galat: "Surel atau kata sandi salah, atau akun ini tidak aktif." };
    }
    throw galat;
  }
}

/** Keluar dari sesi. */
export async function keluar() {
  await signOut({ redirectTo: "/masuk" });
}
