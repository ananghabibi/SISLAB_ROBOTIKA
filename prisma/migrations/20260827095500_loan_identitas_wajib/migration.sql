-- Alat yang dibawa keluar laboratorium wajib punya jaminan identitas.
--
-- Ditegakkan basis data, bukan hanya oleh formulir: aturan ini melindungi aset
-- laboratorium, dan aturan semacam itu tidak boleh bisa dilewati oleh jalur
-- penulisan lain yang ditambahkan kelak.
--
-- Baris tetap sah setelah fotonya dihapus saat pengembalian, asalkan penghapusan
-- itu tercatat waktunya. Dengan begitu "tidak ada foto" selalu punya sebab yang
-- terbaca: belum pernah ada, atau sudah dibuang setelah alatnya kembali.
ALTER TABLE "loans"
  ADD CONSTRAINT "loans_identitas_wajib"
  CHECK (
    "dibawaKeluar" = false
    OR "fotoIdentitasUrl" IS NOT NULL
    OR "identitasDihapusPada" IS NOT NULL
  );
