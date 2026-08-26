-- Satu aset hanya boleh punya SATU pinjaman berstatus DIPINJAM pada satu waktu.
-- Ditegakkan di tingkat basis data (partial unique index), bukan sekadar validasi
-- di aplikasi, agar dua permintaan bersamaan tidak bisa lolos bersama-sama.
CREATE UNIQUE INDEX "loans_asset_dipinjam_unik"
  ON "loans" ("assetId")
  WHERE ("status" = 'DIPINJAM');

-- Jumlah pinjam harus positif.
ALTER TABLE "loans"
  ADD CONSTRAINT "loans_jumlah_positif" CHECK ("jumlah" > 0);

-- Jam keluar tidak boleh mendahului jam masuk.
ALTER TABLE "attendances"
  ADD CONSTRAINT "attendances_jam_urut"
  CHECK ("jamKeluar" IS NULL OR "jamKeluar" >= "jamMasuk");
