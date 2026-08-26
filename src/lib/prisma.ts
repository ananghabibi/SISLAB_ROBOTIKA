import { PrismaClient } from "@prisma/client";

// Di mode pengembangan Next.js memuat ulang modul setiap perubahan berkas.
// Tanpa cache global, setiap muat ulang membuka kumpulan koneksi baru dan
// PostgreSQL kehabisan slot koneksi dalam beberapa menit.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
