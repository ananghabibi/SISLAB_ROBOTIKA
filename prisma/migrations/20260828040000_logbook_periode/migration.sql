-- Logbook menjadi milik sebuah periode.
--
-- Kekangan unik sebelumnya, (squadId, mingguKe), memperlakukan nomor pekan
-- sebagai angka yang tidak pernah berulang. Padahal pekan dihitung terhadap
-- awal periode dan kembali ke 1 setiap semester: logbook pekan 1 semester
-- depan akan ditolak karena bertabrakan dengan pekan 1 semester ini, dan
-- pesannya tidak akan berarti apa-apa bagi yang mengisinya.
--
-- Tabel ini masih kosong pada saat migrasi ini dibuat — modul logbook baru
-- dibangun di Milestone 5 — sehingga kolomnya dapat langsung NOT NULL tanpa
-- nilai sementara.

ALTER TABLE "logbooks" ADD COLUMN "periodId" TEXT NOT NULL;

DROP INDEX "logbooks_squadId_mingguKe_key";

CREATE INDEX "logbooks_periodId_idx" ON "logbooks"("periodId");

CREATE UNIQUE INDEX "logbooks_squadId_periodId_mingguKe_key" ON "logbooks"("squadId", "periodId", "mingguKe");

ALTER TABLE "logbooks" ADD CONSTRAINT "logbooks_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
