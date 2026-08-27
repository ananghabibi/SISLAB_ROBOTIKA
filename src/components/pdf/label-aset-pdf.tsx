// -----------------------------------------------------------------------------
// Lembar label QR aset, siap cetak di kertas A4.
//
// Label ditempel pada alat, jadi ukurannya ditentukan oleh benda terkecil yang
// masih masuk akal ditempeli — bukan oleh berapa banyak yang muat dalam satu
// halaman. Tiga kolom kali tujuh baris memberi label sekitar 5,8 x 3,6 cm:
// cukup besar untuk dipindai kamera ponsel dari jarak sejengkal, cukup kecil
// untuk muat di sisi kotak alat.
//
// Sama seperti dokumen PDF lain di proyek ini, hanya huruf bawaan Helvetica
// yang dipakai: pencetakan berlangsung di laboratorium, yang tidak bisa
// mengandalkan unduhan huruf.
// -----------------------------------------------------------------------------

import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

/** Label per halaman; harus sama dengan pembagian kolom dan tinggi di bawah. */
export const KOLOM_PER_HALAMAN = 3;
export const BARIS_PER_HALAMAN = 7;
export const LABEL_PER_HALAMAN = KOLOM_PER_HALAMAN * BARIS_PER_HALAMAN;

const gaya = StyleSheet.create({
  halaman: { paddingHorizontal: 24, paddingVertical: 24, fontFamily: "Helvetica" },
  lembar: { flexDirection: "row", flexWrap: "wrap" },
  label: {
    width: `${100 / KOLOM_PER_HALAMAN}%`,
    height: 104,
    padding: 4,
  },
  bingkai: {
    flexDirection: "row",
    alignItems: "center",
    height: "100%",
    borderWidth: 0.75,
    borderColor: "#b9c0c9",
    borderStyle: "dashed",
    borderRadius: 4,
    padding: 6,
  },
  qr: { width: 78, height: 78 },
  teks: { flex: 1, paddingLeft: 6 },
  kode: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#14181f" },
  nama: { fontSize: 8, marginTop: 2, color: "#14181f", lineHeight: 1.25 },
  rinci: { fontSize: 6.5, marginTop: 3, color: "#59616e", lineHeight: 1.3 },
  lembaga: { fontSize: 5.5, marginTop: 4, color: "#8d949d" },
  kaki: {
    position: "absolute",
    bottom: 10,
    left: 24,
    right: 24,
    fontSize: 7,
    color: "#8d949d",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export interface LabelAset {
  kodeAset: string;
  nama: string;
  kategori: string;
  lokasi: string;
  /** PNG QR sebagai data URL; dibuat di peladen, bukan di peramban. */
  qr: string;
}

export interface PropsLabelPdf {
  label: LabelAset[];
  dicetakPada: string;
}

/** Memotong nama panjang supaya tidak mendorong isi label keluar bingkai. */
function ringkas(teks: string, batas: number): string {
  return teks.length <= batas ? teks : `${teks.slice(0, batas - 1).trimEnd()}…`;
}

function potong<T>(daftar: T[], ukuran: number): T[][] {
  const hasil: T[][] = [];
  for (let i = 0; i < daftar.length; i += ukuran) hasil.push(daftar.slice(i, i + ukuran));
  return hasil;
}

export function DokumenLabelAset({ label, dicetakPada }: PropsLabelPdf) {
  const halaman = potong(label, LABEL_PER_HALAMAN);

  return (
    <Document
      title="Label QR aset SILAB"
      author="SILAB — Laboratorium Robotika FT UNISMA"
    >
      {halaman.map((isi, nomor) => (
        <Page key={nomor} size="A4" style={gaya.halaman}>
          <View style={gaya.lembar}>
            {isi.map((a) => (
              <View key={a.kodeAset} style={gaya.label} wrap={false}>
                <View style={gaya.bingkai}>
                  <Image src={a.qr} style={gaya.qr} />
                  <View style={gaya.teks}>
                    <Text style={gaya.kode}>{a.kodeAset}</Text>
                    <Text style={gaya.nama}>{ringkas(a.nama, 46)}</Text>
                    <Text style={gaya.rinci}>
                      {ringkas(a.kategori, 22)}
                      {"\n"}
                      {ringkas(a.lokasi, 26)}
                    </Text>
                    <Text style={gaya.lembaga}>Lab Robotika FT UNISMA</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
          <View style={gaya.kaki} fixed>
            <Text>Label QR aset — dicetak {dicetakPada}</Text>
            <Text>
              Halaman {nomor + 1} dari {halaman.length}
            </Text>
          </View>
        </Page>
      ))}
    </Document>
  );
}
