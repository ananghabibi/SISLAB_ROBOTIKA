// -----------------------------------------------------------------------------
// Lembar Surat Keterangan Kontribusi, format FRM-LR-07.
//
// Seluruh angkanya datang dari `snapshotJson`, tidak satu pun dihitung ulang
// di sini. Itulah yang membuat surat yang sudah terbit tidak berubah walau
// data absensi dikoreksi sesudahnya — dan surat resmi yang angkanya bisa
// bergeser sendiri lebih buruk daripada tidak ada surat sama sekali.
//
// Hanya memakai huruf bawaan Helvetica: berkas ini dicetak di laboratorium
// tanpa akses internet, dan huruf yang gagal diunduh menghasilkan halaman kosong.
// -----------------------------------------------------------------------------

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { catatanFakultasLain } from "@/lib/skk";
import type { IsiSnapshotSkk } from "@/lib/skk-terbit";

const gaya = StyleSheet.create({
  halaman: {
    paddingHorizontal: 56,
    paddingVertical: 40,
    fontSize: 10.5,
    fontFamily: "Helvetica",
    lineHeight: 1.5,
  },
  kop: { borderBottomWidth: 2, borderBottomColor: "#14416b", paddingBottom: 8, marginBottom: 4 },
  lembaga: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#14416b", textAlign: "center" },
  unit: { fontSize: 11, fontFamily: "Helvetica-Bold", textAlign: "center", marginTop: 2 },
  alamat: { fontSize: 8.5, color: "#59616e", textAlign: "center", marginTop: 3 },
  kodeForm: { fontSize: 8, color: "#59616e", textAlign: "right", marginBottom: 10 },
  judul: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginTop: 14,
    textDecoration: "underline",
  },
  nomor: { fontSize: 10, textAlign: "center", marginBottom: 14 },
  paragraf: { marginBottom: 8, textAlign: "justify" },
  identitas: { marginLeft: 18, marginBottom: 8 },
  barisIdentitas: { flexDirection: "row" },
  label: { width: 120 },
  pemisah: { width: 10 },
  tabel: { marginTop: 4, marginBottom: 10, marginLeft: 18, marginRight: 18 },
  barisTabel: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#dfe3e8" },
  kepalaTabel: {
    flexDirection: "row",
    backgroundColor: "#e7eef6",
    borderBottomWidth: 1,
    borderBottomColor: "#14416b",
  },
  sel: { paddingVertical: 4, paddingHorizontal: 5, fontSize: 10 },
  selTebal: { paddingVertical: 4, paddingHorizontal: 5, fontSize: 10, fontFamily: "Helvetica-Bold" },
  catatan: {
    marginTop: 6,
    marginBottom: 10,
    padding: 8,
    backgroundColor: "#f6f7f9",
    fontSize: 9.5,
    lineHeight: 1.45,
  },
  tandaTangan: { marginTop: 24, alignItems: "flex-end" },
  blokTtd: { width: 220 },
  ruangTtd: { height: 52 },
  namaTtd: { fontFamily: "Helvetica-Bold", textDecoration: "underline" },
  kaki: {
    position: "absolute",
    bottom: 26,
    left: 56,
    right: 56,
    fontSize: 7.5,
    color: "#59616e",
    borderTopWidth: 0.5,
    borderTopColor: "#dfe3e8",
    paddingTop: 5,
    lineHeight: 1.4,
  },
});

export interface PropsSkkPdf {
  nomor: string;
  tanggalTerbit: string;
  isi: IsiSnapshotSkk;
  namaKepalaLab: string;
}

function Baris({ label, nilai }: { label: string; nilai: string }) {
  return (
    <View style={gaya.barisIdentitas}>
      <Text style={gaya.label}>{label}</Text>
      <Text style={gaya.pemisah}>:</Text>
      <Text>{nilai}</Text>
    </View>
  );
}

export function DokumenSkk({ nomor, tanggalTerbit, isi, namaKepalaLab }: PropsSkkPdf) {
  const catatanFakultas = catatanFakultasLain(isi.fakultas);
  const angka: [string, string][] = [
    ["Hari hadir", `${isi.hariHadir} hari (${isi.persenHadir}% dari target periode)`],
    ["Jam tercatat", `${isi.totalJam} jam`],
    ["Sesi berbagi ilmu", `${isi.sesiBerbagi} kali`],
    ["Piket laboratorium", `${isi.piket} kali`],
    ["Logbook riset squad", `${isi.entriLogbook} entri pada ${isi.pekanAktif} pekan aktif`],
    ["Skor kontribusi", `${isi.skor} dari 100 (ambang kelulusan ${isi.ambangLulus})`],
  ];

  return (
    <Document
      title={`Surat Keterangan Kontribusi — ${isi.nama}`}
      author="Laboratorium Robotika FT UNISMA"
    >
      <Page size="A4" style={gaya.halaman}>
        <View style={gaya.kop}>
          <Text style={gaya.lembaga}>UNIVERSITAS ISLAM MALANG</Text>
          <Text style={gaya.unit}>FAKULTAS TEKNIK — LABORATORIUM ROBOTIKA</Text>
          <Text style={gaya.alamat}>
            Jalan Mayjen Haryono 193, Malang 65144, Jawa Timur
          </Text>
        </View>
        <Text style={gaya.kodeForm}>FRM-LR-07</Text>

        <Text style={gaya.judul}>SURAT KETERANGAN KONTRIBUSI</Text>
        <Text style={gaya.nomor}>Nomor: {nomor}</Text>

        <Text style={gaya.paragraf}>
          Yang bertanda tangan di bawah ini, Kepala Laboratorium Robotika Fakultas Teknik
          Universitas Islam Malang, menerangkan bahwa:
        </Text>

        <View style={gaya.identitas}>
          <Baris label="Nama" nilai={isi.nama} />
          <Baris label="NPM" nilai={isi.npm ?? "—"} />
          <Baris label="Fakultas" nilai={isi.fakultas} />
          <Baris label="Squad" nilai={isi.squad ?? "—"} />
        </View>

        <Text style={gaya.paragraf}>
          adalah anggota aktif Laboratorium Robotika pada {isi.namaPeriode} (
          {isi.rentangPeriode}), dengan capaian kontribusi sebagai berikut:
        </Text>

        <View style={gaya.tabel}>
          <View style={gaya.kepalaTabel}>
            <Text style={[gaya.selTebal, { width: "45%" }]}>Komponen</Text>
            <Text style={[gaya.selTebal, { width: "55%" }]}>Capaian</Text>
          </View>
          {angka.map(([label, nilai]) => (
            <View key={label} style={gaya.barisTabel}>
              <Text style={[gaya.sel, { width: "45%" }]}>{label}</Text>
              <Text style={[gaya.sel, { width: "55%" }]}>{nilai}</Text>
            </View>
          ))}
        </View>

        {isi.diterbitkanMeskiKurang.length > 0 ? (
          <View style={gaya.catatan}>
            <Text>
              Catatan: surat ini diterbitkan atas pertimbangan Kepala Laboratorium meskipun
              syarat berikut belum terpenuhi menurut hitungan sistem —{" "}
              {isi.diterbitkanMeskiKurang.join(", ")}.
            </Text>
          </View>
        ) : null}

        {catatanFakultas ? (
          <View style={gaya.catatan}>
            <Text>{catatanFakultas}</Text>
          </View>
        ) : null}

        <Text style={gaya.paragraf}>
          Surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya. Angka pada surat
          ini dibekukan pada tanggal penerbitan dan tidak berubah oleh koreksi data setelahnya.
        </Text>

        <View style={gaya.tandaTangan}>
          <View style={gaya.blokTtd}>
            <Text>Malang, {tanggalTerbit}</Text>
            <Text>Kepala Laboratorium Robotika,</Text>
            <View style={gaya.ruangTtd} />
            <Text style={gaya.namaTtd}>{namaKepalaLab}</Text>
          </View>
        </View>

        <Text style={gaya.kaki} fixed>
          FRM-LR-07 · Surat Keterangan Kontribusi · Laboratorium Robotika FT UNISMA{"\n"}
          Keaslian surat dapat dicocokkan dengan nomor {nomor} pada Sistem Informasi Laboratorium
          Robotika. Angka pada surat ini dibekukan saat penerbitan.
        </Text>
      </Page>
    </Document>
  );
}
