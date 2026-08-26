import type { Jenjang, Role, StatusAnggota } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      nama: string;
      npm: string | null;
      role: Role;
      jenjang: Jenjang;
      status: StatusAnggota;
      squadId: string | null;
      squadNama: string | null;
      fakultas: string;
    } & DefaultSession["user"];
  }
}

// Catatan: `next-auth/jwt` hanya meneruskan ekspor dari `@auth/core/jwt`.
// Augmentasi harus menyasar modul aslinya, kalau tidak ia diam-diam tidak
// tergabung dan seluruh medan token berakhir bertipe `unknown`.
declare module "@auth/core/jwt" {
  interface JWT {
    uid: string;
    nama: string;
    npm: string | null;
    role: Role;
    jenjang: Jenjang;
    status: StatusAnggota;
    squadId: string | null;
    squadNama: string | null;
    fakultas: string;
    /** Detik epoch saat data peran terakhir disegarkan dari basis data. */
    segarPada: number;
  }
}

export {};
