-- CreateEnum
CREATE TYPE "Role" AS ENUM ('KEPALA_LAB', 'KOORD_OPERASIONAL', 'KOORD_RISET', 'KOORD_PENGEMBANGAN', 'KETUA_SQUAD', 'ANGGOTA', 'PENGAWAS');

-- CreateEnum
CREATE TYPE "Jenjang" AS ENUM ('MUDA', 'MADYA', 'UTAMA', 'KOORDINATOR', 'KEPALA_LAB');

-- CreateEnum
CREATE TYPE "StatusAnggota" AS ENUM ('AKTIF', 'CUTI', 'NONAKTIF', 'LULUS');

-- CreateEnum
CREATE TYPE "JenisKegiatan" AS ENUM ('RISET', 'PIKET', 'RAPAT', 'PELATIHAN', 'PENGABDIAN', 'ADMINISTRASI', 'LAINNYA');

-- CreateEnum
CREATE TYPE "KondisiAset" AS ENUM ('BAIK', 'PERLU_DICEK', 'RUSAK_RINGAN', 'RUSAK', 'DALAM_PERBAIKAN', 'DALAM_PENGEMBANGAN', 'TERPAKAI', 'HILANG');

-- CreateEnum
CREATE TYPE "StatusPinjam" AS ENUM ('DIPINJAM', 'KEMBALI', 'TERLAMBAT', 'HILANG');

-- CreateEnum
CREATE TYPE "JenisInsiden" AS ENUM ('CEDERA', 'KEBAKARAN', 'KERUSAKAN_ALAT', 'NYARIS_CELAKA', 'LAINNYA');

-- CreateEnum
CREATE TYPE "StatusTindakLanjut" AS ENUM ('BARU', 'DITINJAU', 'DITANGANI', 'SELESAI');

-- CreateEnum
CREATE TYPE "StatusKontribusi" AS ENUM ('LULUS', 'BELUM_LULUS');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nama" TEXT NOT NULL,
    "npm" TEXT,
    "email" TEXT NOT NULL,
    "prodi" TEXT NOT NULL,
    "fakultas" TEXT NOT NULL DEFAULT 'Teknik',
    "angkatan" INTEGER,
    "semester" INTEGER,
    "squadId" TEXT,
    "role" "Role" NOT NULL DEFAULT 'ANGGOTA',
    "jenjang" "Jenjang" NOT NULL DEFAULT 'MUDA',
    "status" "StatusAnggota" NOT NULL DEFAULT 'AKTIF',
    "avatarUrl" TEXT,
    "passwordHash" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "squads" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nama" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "ketuaId" TEXT,
    "deskripsi" TEXT,

    CONSTRAINT "squads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periods" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nama" TEXT NOT NULL,
    "tanggalMulai" DATE NOT NULL,
    "tanggalSelesai" DATE NOT NULL,
    "targetHadir" INTEGER NOT NULL,
    "targetSesiBerbagi" INTEGER NOT NULL,
    "targetPiket" INTEGER NOT NULL,
    "targetLogbook" INTEGER NOT NULL,
    "ambangLulus" INTEGER NOT NULL DEFAULT 70,
    "aktif" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_codes" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tanggal" DATE NOT NULL,
    "kode" TEXT NOT NULL,
    "dibuatOtomatis" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "daily_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendances" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "tanggal" DATE NOT NULL,
    "jamMasuk" TIMESTAMP(3) NOT NULL,
    "jamKeluar" TIMESTAMP(3),
    "jenisKegiatan" "JenisKegiatan" NOT NULL DEFAULT 'RISET',
    "rencana" TEXT,
    "uraian" TEXT,
    "kendala" TEXT,
    "ipMasuk" TEXT NOT NULL,
    "ipKeluar" TEXT,
    "manual" BOOLEAN NOT NULL DEFAULT false,
    "alasanManual" TEXT,
    "dibatalkan" BOOLEAN NOT NULL DEFAULT false,
    "dibatalkanOlehId" TEXT,
    "catatanPembatalan" TEXT,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "kodeAset" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kategori" TEXT NOT NULL,
    "merk" TEXT,
    "jumlah" INTEGER NOT NULL DEFAULT 1,
    "satuan" TEXT NOT NULL DEFAULT 'unit',
    "kondisi" "KondisiAset" NOT NULL DEFAULT 'BAIK',
    "lokasi" TEXT NOT NULL,
    "tahunPerolehan" INTEGER,
    "penanggungJawabId" TEXT,
    "bolehDipinjam" BOOLEAN NOT NULL DEFAULT true,
    "keterangan" TEXT,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loans" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "assetId" TEXT NOT NULL,
    "peminjamId" TEXT NOT NULL,
    "petugasPinjamId" TEXT NOT NULL,
    "tglPinjam" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jumlah" INTEGER NOT NULL DEFAULT 1,
    "keperluan" TEXT NOT NULL,
    "rencanaKembali" TIMESTAMP(3) NOT NULL,
    "fotoPinjamUrl" TEXT NOT NULL,
    "tglKembali" TIMESTAMP(3),
    "petugasKembaliId" TEXT,
    "kondisiKembali" "KondisiAset",
    "fotoKembaliUrl" TEXT,
    "catatan" TEXT,
    "status" "StatusPinjam" NOT NULL DEFAULT 'DIPINJAM',

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "piket_logs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tanggal" DATE NOT NULL,
    "squadId" TEXT NOT NULL,
    "pengisiId" TEXT NOT NULL,
    "checklist" JSONB NOT NULL,
    "alatBelumKembali" INTEGER NOT NULL DEFAULT 0,
    "fotoSebelumUrl" TEXT NOT NULL,
    "fotoSesudahUrl" TEXT NOT NULL,

    CONSTRAINT "piket_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logbooks" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "squadId" TEXT NOT NULL,
    "mingguKe" INTEGER NOT NULL,
    "tanggal" DATE NOT NULL,
    "dibuatOlehId" TEXT NOT NULL,
    "anggotaTerlibat" JSONB NOT NULL,
    "target" TEXT NOT NULL,
    "dikerjakan" TEXT NOT NULL,
    "hasil" TEXT NOT NULL,
    "kendala" TEXT,
    "rencanaBerikutnya" TEXT NOT NULL,
    "buktiUrl" TEXT,

    CONSTRAINT "logbooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tanggal" DATE NOT NULL,
    "pelaporId" TEXT NOT NULL,
    "lokasi" TEXT NOT NULL,
    "jenis" "JenisInsiden" NOT NULL,
    "kronologi" TEXT NOT NULL,
    "tindakan" TEXT NOT NULL,
    "saran" TEXT,
    "fotoUrl" TEXT,
    "statusTindakLanjut" "StatusTindakLanjut" NOT NULL DEFAULT 'BARU',

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guests" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tanggal" DATE NOT NULL,
    "nama" TEXT NOT NULL,
    "instansi" TEXT NOT NULL,
    "keperluan" TEXT NOT NULL,
    "pendampingId" TEXT NOT NULL,
    "jamMasuk" TIMESTAMP(3) NOT NULL,
    "jamKeluar" TIMESTAMP(3),

    CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contribution_snapshots" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "periodId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hariHadir" INTEGER NOT NULL DEFAULT 0,
    "persenHadir" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalJam" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sesiBerbagi" INTEGER NOT NULL DEFAULT 0,
    "piket" INTEGER NOT NULL DEFAULT 0,
    "entriLogbook" INTEGER NOT NULL DEFAULT 0,
    "alatBelumKembali" INTEGER NOT NULL DEFAULT 0,
    "skor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "StatusKontribusi" NOT NULL DEFAULT 'BELUM_LULUS',
    "dihitungPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contribution_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skk" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "tanggalTerbit" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snapshotJson" JSONB NOT NULL,
    "pdfUrl" TEXT,
    "diterbitkanOlehId" TEXT NOT NULL,

    CONSTRAINT "skk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "aksi" TEXT NOT NULL,
    "entitas" TEXT NOT NULL,
    "entitasId" TEXT,
    "dataLama" JSONB,
    "dataBaru" JSONB,
    "ip" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_npm_key" ON "users"("npm");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_squadId_idx" ON "users"("squadId");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "squads_kode_key" ON "squads"("kode");

-- CreateIndex
CREATE INDEX "periods_aktif_idx" ON "periods"("aktif");

-- CreateIndex
CREATE UNIQUE INDEX "daily_codes_tanggal_key" ON "daily_codes"("tanggal");

-- CreateIndex
CREATE INDEX "attendances_tanggal_idx" ON "attendances"("tanggal");

-- CreateIndex
CREATE INDEX "attendances_userId_idx" ON "attendances"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_userId_tanggal_key" ON "attendances"("userId", "tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "assets_kodeAset_key" ON "assets"("kodeAset");

-- CreateIndex
CREATE INDEX "assets_kategori_idx" ON "assets"("kategori");

-- CreateIndex
CREATE INDEX "loans_assetId_idx" ON "loans"("assetId");

-- CreateIndex
CREATE INDEX "loans_peminjamId_idx" ON "loans"("peminjamId");

-- CreateIndex
CREATE INDEX "loans_status_idx" ON "loans"("status");

-- CreateIndex
CREATE INDEX "piket_logs_tanggal_idx" ON "piket_logs"("tanggal");

-- CreateIndex
CREATE INDEX "piket_logs_squadId_idx" ON "piket_logs"("squadId");

-- CreateIndex
CREATE INDEX "logbooks_squadId_idx" ON "logbooks"("squadId");

-- CreateIndex
CREATE UNIQUE INDEX "logbooks_squadId_mingguKe_key" ON "logbooks"("squadId", "mingguKe");

-- CreateIndex
CREATE INDEX "incidents_tanggal_idx" ON "incidents"("tanggal");

-- CreateIndex
CREATE INDEX "incidents_statusTindakLanjut_idx" ON "incidents"("statusTindakLanjut");

-- CreateIndex
CREATE INDEX "guests_tanggal_idx" ON "guests"("tanggal");

-- CreateIndex
CREATE INDEX "contribution_snapshots_periodId_idx" ON "contribution_snapshots"("periodId");

-- CreateIndex
CREATE UNIQUE INDEX "contribution_snapshots_periodId_userId_key" ON "contribution_snapshots"("periodId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "skk_nomor_key" ON "skk"("nomor");

-- CreateIndex
CREATE UNIQUE INDEX "skk_userId_periodId_key" ON "skk"("userId", "periodId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entitas_entitasId_idx" ON "audit_logs"("entitas", "entitasId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "squads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "squads" ADD CONSTRAINT "squads_ketuaId_fkey" FOREIGN KEY ("ketuaId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_dibatalkanOlehId_fkey" FOREIGN KEY ("dibatalkanOlehId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_penanggungJawabId_fkey" FOREIGN KEY ("penanggungJawabId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_peminjamId_fkey" FOREIGN KEY ("peminjamId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_petugasPinjamId_fkey" FOREIGN KEY ("petugasPinjamId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_petugasKembaliId_fkey" FOREIGN KEY ("petugasKembaliId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "piket_logs" ADD CONSTRAINT "piket_logs_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "squads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "piket_logs" ADD CONSTRAINT "piket_logs_pengisiId_fkey" FOREIGN KEY ("pengisiId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logbooks" ADD CONSTRAINT "logbooks_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "squads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logbooks" ADD CONSTRAINT "logbooks_dibuatOlehId_fkey" FOREIGN KEY ("dibuatOlehId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_pelaporId_fkey" FOREIGN KEY ("pelaporId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guests" ADD CONSTRAINT "guests_pendampingId_fkey" FOREIGN KEY ("pendampingId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contribution_snapshots" ADD CONSTRAINT "contribution_snapshots_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contribution_snapshots" ADD CONSTRAINT "contribution_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skk" ADD CONSTRAINT "skk_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skk" ADD CONSTRAINT "skk_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skk" ADD CONSTRAINT "skk_diterbitkanOlehId_fkey" FOREIGN KEY ("diterbitkanOlehId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
