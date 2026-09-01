-- Menandai akun yang masih memakai kata sandi bawaan.
--
-- Bawaannya `false`, jadi seluruh akun yang sudah ada tidak ikut terkunci saat
-- migrasi ini dijalankan. Hanya akun yang dibuat SESUDAH ini — lewat formulir
-- `/anggota/baru` maupun lewat seeder — yang menyala benderanya, dan menyala
-- itu berarti: hanya Dasbor dan Profil yang terbuka sampai sandinya diganti.

ALTER TABLE "users" ADD COLUMN "wajibGantiSandi" BOOLEAN NOT NULL DEFAULT false;
