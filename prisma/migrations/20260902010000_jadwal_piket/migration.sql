-- Jadwal piket mingguan yang dapat disunting dari antarmuka.
--
-- Satu baris per hari kerja (1 Senin .. 6 Sabtu). `squadId` boleh NULL: hari
-- yang belum ditetapkan siapa piketnya. Seeder mengisi nilai awalnya dari
-- data/jadwal-piket.csv; sesudah itu tabel ini yang berlaku.

CREATE TABLE "jadwal_piket" (
    "hari" INTEGER NOT NULL,
    "squadId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "jadwal_piket_pkey" PRIMARY KEY ("hari")
);

ALTER TABLE "jadwal_piket"
  ADD CONSTRAINT "jadwal_piket_squadId_fkey"
  FOREIGN KEY ("squadId") REFERENCES "squads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
