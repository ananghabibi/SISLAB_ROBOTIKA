-- AlterTable
ALTER TABLE "loans" ADD COLUMN     "dibawaKeluar" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fotoIdentitasUrl" TEXT,
ADD COLUMN     "identitasDihapusPada" TIMESTAMP(3);
