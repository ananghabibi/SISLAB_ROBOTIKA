// Gaya bersama untuk kedua dokumen SILAB.
const {
  AlignmentType, BorderStyle, Footer, Header, HeadingLevel, LevelFormat,
  PageNumber, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun,
  WidthType, convertInchesToTwip,
} = require("docx");

const BIRU = "14416B";
const BIRU_MUDA = "E7EEF6";
const ABU = "59616E";
const GARIS = "DFE3E8";
const KUNING = "FDF0DC";
const LEBAR = 9026; // A4 dikurangi margin kiri-kanan 1 inci.

const penomoran = {
  config: [
    {
      reference: "poin",
      levels: [
        {
          level: 0,
          format: LevelFormat.BULLET,
          text: "•",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 360, hanging: 260 } } },
        },
      ],
    },
    {
      reference: "langkah",
      levels: [
        {
          level: 0,
          format: LevelFormat.DECIMAL,
          text: "%1.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 400, hanging: 300 } } },
        },
      ],
    },
  ],
};

const gayaDokumen = {
  default: {
    document: { run: { font: "Calibri", size: 22 }, paragraph: { spacing: { after: 120, line: 276 } } },
    heading1: {
      run: { font: "Calibri", size: 32, bold: true, color: BIRU },
      paragraph: { spacing: { before: 360, after: 160 } },
    },
    heading2: {
      run: { font: "Calibri", size: 26, bold: true, color: BIRU },
      paragraph: { spacing: { before: 260, after: 120 } },
    },
    heading3: {
      run: { font: "Calibri", size: 23, bold: true, color: "14181F" },
      paragraph: { spacing: { before: 200, after: 100 } },
    },
  },
};

const j1 = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_1 });
const j2 = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_2 });
const j3 = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_3 });

/** Paragraf biasa. Menerima teks atau larik TextRun. */
function p(isi, opsi = {}) {
  const children = typeof isi === "string" ? [new TextRun(isi)] : isi;
  return new Paragraph({ children, ...opsi });
}

const tebal = (t) => new TextRun({ text: t, bold: true });
const biasa = (t) => new TextRun(t);
const mono = (t) => new TextRun({ text: t, font: "Consolas", size: 20 });

const poin = (isi) =>
  new Paragraph({
    children: typeof isi === "string" ? [new TextRun(isi)] : isi,
    numbering: { reference: "poin", level: 0 },
    spacing: { after: 60 },
  });

const langkah = (isi) =>
  new Paragraph({
    children: typeof isi === "string" ? [new TextRun(isi)] : isi,
    numbering: { reference: "langkah", level: 0 },
    spacing: { after: 60 },
  });

/** Blok perintah: satu paragraf per baris, berlatar abu muda. */
function kode(...baris) {
  return baris.map((b, i) =>
    new Paragraph({
      children: [new TextRun({ text: b, font: "Consolas", size: 20 })],
      shading: { type: ShadingType.CLEAR, fill: "F3F4F6" },
      spacing: { before: i === 0 ? 100 : 0, after: i === baris.length - 1 ? 140 : 0 },
      indent: { left: 200, right: 200 },
      border: {
        left: { style: BorderStyle.SINGLE, size: 12, color: BIRU, space: 8 },
      },
    }),
  );
}

/** Kotak catatan penting. */
function catatan(judul, isi) {
  return new Paragraph({
    children: [tebal(judul + " "), biasa(isi)],
    shading: { type: ShadingType.CLEAR, fill: KUNING },
    spacing: { before: 140, after: 160 },
    indent: { left: 160, right: 160 },
    // Hanya sisi kiri. Skema OOXML menuntut urutan atas-kiri-bawah-kanan,
    // sedangkan docx-js menuliskannya atas-bawah-kiri-kanan — sehingga bingkai
    // empat sisi SELALU ditolak pemvalidasi. Satu batang di kiri lagi pula
    // lebih terbaca sebagai kotak catatan, dan seragam dengan blok perintah.
    border: {
      left: { style: BorderStyle.SINGLE, size: 18, color: "D19A2E", space: 10 },
    },
  });
}

function sel(isi, { kepala = false, lebar, monospasi = false } = {}) {
  const runs =
    typeof isi === "string"
      ? [new TextRun({ text: isi, bold: kepala, font: monospasi ? "Consolas" : undefined, size: monospasi ? 19 : (kepala ? 21 : 21) })]
      : isi;
  return new TableCell({
    width: { size: lebar, type: WidthType.DXA },
    shading: kepala ? { type: ShadingType.CLEAR, fill: BIRU_MUDA } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: runs, spacing: { after: 0 } })],
  });
}

/** Tabel dengan lebar kolom yang dijumlahkan tepat 9026 dxa. */
function tabel(kepala, baris, lebarKolom, opsi = {}) {
  const jumlah = lebarKolom.reduce((a, b) => a + b, 0);
  if (jumlah !== LEBAR) throw new Error(`Lebar kolom harus berjumlah ${LEBAR}, bukan ${jumlah}`);

  const barisKepala = new TableRow({
    tableHeader: true,
    children: kepala.map((t, i) => sel(t, { kepala: true, lebar: lebarKolom[i] })),
  });
  const barisIsi = baris.map(
    (b) =>
      new TableRow({
        children: b.map((t, i) =>
          sel(t, { lebar: lebarKolom[i], monospasi: (opsi.monoKolom ?? []).includes(i) }),
        ),
      }),
  );

  return new Table({
    columnWidths: lebarKolom,
    width: { size: LEBAR, type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: GARIS },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: GARIS },
      left: { style: BorderStyle.SINGLE, size: 4, color: GARIS },
      right: { style: BorderStyle.SINGLE, size: 4, color: GARIS },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: GARIS },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: GARIS },
    },
    rows: [barisKepala, ...barisIsi],
  });
}

const jarak = (tinggi = 200) => new Paragraph({ text: "", spacing: { after: tinggi } });

function kaki(namaDokumen) {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120 },
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: GARIS, space: 8 } },
        children: [
          new TextRun({ text: `${namaDokumen}  ·  SILAB Laboratorium Robotika FT UNISMA  ·  hal. `, size: 16, color: ABU }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, color: ABU }),
          new TextRun({ text: " dari ", size: 16, color: ABU }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: ABU }),
        ],
      }),
    ],
  });
}

function sampul(judul, anak, keterangan) {
  return [
    jarak(1400),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: "SILAB", bold: true, size: 56, color: BIRU })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 420 },
      children: [
        new TextRun({
          text: "Sistem Informasi Laboratorium Robotika",
          size: 24,
          color: ABU,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      border: { top: { style: BorderStyle.SINGLE, size: 12, color: BIRU, space: 14 } },
      children: [new TextRun({ text: judul, bold: true, size: 40 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 500 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: BIRU, space: 14 } },
      children: [new TextRun({ text: anak, size: 24, color: ABU })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 1200 },
      children: [new TextRun({ text: keterangan, size: 21, color: ABU, italics: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "Fakultas Teknik · Universitas Islam Malang", size: 22 })],
    }),
  ];
}

module.exports = {
  BIRU, BIRU_MUDA, ABU, GARIS, LEBAR,
  penomoran, gayaDokumen,
  j1, j2, j3, p, poin, langkah, kode, catatan, tabel, jarak, kaki, sampul,
  tebal, biasa, mono,
};
