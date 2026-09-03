# Pembuat dokumen Word

Dua berkas Word di `docs/` dibuat dari skrip di sini, bukan diketik tangan.
Mengubah berkas Word-nya langsung berarti perubahan itu hilang pada pembuatan
berikutnya.

```bash
npm install docx          # sekali saja, di folder ini
node instalasi.js ../../docs/Panduan-Instalasi-SILAB.docx
node tutorial.js  ../../docs/Tutorial-Menu-SILAB.docx
```

`gaya.js` memuat gaya bersama keduanya: palet, penomoran, tabel, blok perintah,
dan kotak catatan.

## Dua hal yang mudah salah

- **Lebar kolom tabel wajib berjumlah tepat 9026 dxa** — A4 dikurangi margin
  kiri-kanan satu inci. `tabel()` melempar galat bila jumlahnya meleset, karena
  tabel yang tidak pas lebarnya baru terlihat sesudah dicetak.
- **Bingkai paragraf hanya dipakai pada satu sisi.** Skema OOXML menuntut urutan
  atas-kiri-bawah-kanan, sedangkan pustaka `docx` menuliskannya
  atas-bawah-kiri-kanan — sehingga bingkai empat sisi selalu ditolak
  pemvalidasi. Kotak catatan memakai satu batang tebal di kiri.
