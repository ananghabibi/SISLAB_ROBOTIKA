// -----------------------------------------------------------------------------
// Dokumen PDF rekap kontribusi.
//
// Dibuat dengan @react-pdf/renderer, yang sama dengan yang akan dipakai Surat
// Keterangan Kontribusi pada Milestone 6. Sengaja hanya memakai huruf bawaan
// Helvetica: berkas ini dicetak di laboratorium tanpa akses internet, dan huruf
// yang gagal diunduh akan menghasilkan halaman kosong.
// -----------------------------------------------------------------------------

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { RekapAnggota } from "@/lib/kontribusi";

const gaya = StyleSheet.create({
  halaman: { paddingHorizontal: 32, paddingVertical: 28, fontSize: 9, fontFamily: "Helvetica" },
  kop: { borderBottomWidth: 2, borderBottomColor: "#14416b", paddingBottom: 8, marginBottom: 12 },
  lembaga: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#14416b" },
  sub: { fontSize: 9, color: "#59616e", marginTop: 2 },
  judul: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  keterangan: { fontSize: 9, color: "#59616e", marginBottom: 10 },
  baris: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#dfe3e8" },
  kepala: { flexDirection: "row", backgroundColor: "#e7eef6", borderBottomWidth: 1, borderBottomColor: "#14416b" },
  sel: { paddingVertical: 4, paddingHorizontal: 3 },
  selKepala: { paddingVertical: 5, paddingHorizontal: 3, fontFamily: "Helvetica-Bold" },
  kanan: { textAlign: "right" },
  kaki: { marginTop: 14, fontSize: 8, color: "#59616e", lineHeight: 1.5 },
  nomorHalaman: { position: "absolute", bottom: 16, right: 32, fontSize: 8, color: "#59616e" },
});

/** Lebar tiap kolom dalam persen, dijumlahkan tepat 100. */
const LEBAR = {
  nama: "24%",
  npm: "13%",
  squad: "14%",
  hadir: "8%",
  jam: "8%",
  berbagi: "8%",
  piket: "7%",
  logbook: "8%",
  skor: "7%",
  status: "3%",
} as const;

export interface PropsRekapPdf {
  namaPeriode: string;
  rentang: string;
  ambangLulus: number;
  dicetakPada: string;
  dicetakOleh: string;
  rekap: RekapAnggota[];
}

export function DokumenRekap({
  namaPeriode,
  rentang,
  ambangLulus,
  dicetakPada,
  dicetakOleh,
  rekap,
}: PropsRekapPdf) {
  const lulus = rekap.filter((r) => r.rincian.lulus).length;

  return (
    <Document
      title={`Rekap Kontribusi ${namaPeriode}`}
      author="SILAB — Laboratorium Robotika FT UNISMA"
    >
      <Page size="A4" orientation="landscape" style={gaya.halaman}>
        <View style={gaya.kop} fixed>
          <Text style={gaya.lembaga}>LABORATORIUM ROBOTIKA</Text>
          <Text style={gaya.sub}>Fakultas Teknik · Universitas Islam Malang</Text>
        </View>

        <Text style={gaya.judul}>Rekap Kontribusi Anggota</Text>
        <Text style={gaya.keterangan}>
          {namaPeriode} · {rentang} · Ambang kelulusan {ambangLulus} · {lulus} dari {rekap.length}{" "}
          anggota memenuhi ambang
        </Text>

        <View style={gaya.kepala} fixed>
          <Text style={[gaya.selKepala, { width: LEBAR.nama }]}>Nama</Text>
          <Text style={[gaya.selKepala, { width: LEBAR.npm }]}>NPM</Text>
          <Text style={[gaya.selKepala, { width: LEBAR.squad }]}>Squad</Text>
          <Text style={[gaya.selKepala, gaya.kanan, { width: LEBAR.hadir }]}>Hadir</Text>
          <Text style={[gaya.selKepala, gaya.kanan, { width: LEBAR.jam }]}>Jam</Text>
          <Text style={[gaya.selKepala, gaya.kanan, { width: LEBAR.berbagi }]}>Berbagi</Text>
          <Text style={[gaya.selKepala, gaya.kanan, { width: LEBAR.piket }]}>Piket</Text>
          <Text style={[gaya.selKepala, gaya.kanan, { width: LEBAR.logbook }]}>Logbook</Text>
          <Text style={[gaya.selKepala, gaya.kanan, { width: LEBAR.skor }]}>Skor</Text>
          <Text style={[gaya.selKepala, { width: LEBAR.status }]}>L</Text>
        </View>

        {rekap.map((r) => (
          <View key={r.user.id} style={gaya.baris} wrap={false}>
            <Text style={[gaya.sel, { width: LEBAR.nama }]}>{r.user.nama}</Text>
            <Text style={[gaya.sel, { width: LEBAR.npm }]}>{r.user.npm ?? "—"}</Text>
            <Text style={[gaya.sel, { width: LEBAR.squad }]}>{r.user.squad?.kode ?? "—"}</Text>
            <Text style={[gaya.sel, gaya.kanan, { width: LEBAR.hadir }]}>
              {r.komponen.hariHadir}
            </Text>
            <Text style={[gaya.sel, gaya.kanan, { width: LEBAR.jam }]}>{r.totalJam}</Text>
            <Text style={[gaya.sel, gaya.kanan, { width: LEBAR.berbagi }]}>
              {r.komponen.sesiBerbagi}
            </Text>
            <Text style={[gaya.sel, gaya.kanan, { width: LEBAR.piket }]}>{r.komponen.piket}</Text>
            <Text style={[gaya.sel, gaya.kanan, { width: LEBAR.logbook }]}>
              {r.komponen.entriLogbook}
            </Text>
            <Text style={[gaya.sel, gaya.kanan, { width: LEBAR.skor }]}>{r.rincian.skor}</Text>
            <Text style={[gaya.sel, { width: LEBAR.status }]}>
              {r.rincian.lulus ? "v" : "-"}
            </Text>
          </View>
        ))}

        <Text style={gaya.kaki}>
          Skor = 40 x kehadiran + 20 x sesi berbagi + 20 x piket + 20 x logbook - 5 x alat belum
          kembali, dibatasi 0 sampai 100. Kolom L menandai anggota yang memenuhi ambang periode.
          {"\n"}
          Dicetak {dicetakPada} oleh {dicetakOleh}. Berkas ini rekap sementara, bukan Surat
          Keterangan Kontribusi.
        </Text>

        <Text
          style={gaya.nomorHalaman}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}
