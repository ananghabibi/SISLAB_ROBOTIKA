"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Centang, Field, Input, Select, TextArea } from "@/components/ui/field";
import { PesanFormulir, useKosongkanSetelahBerhasil } from "@/components/ui/umpan-balik";
import { KONDISI_ASET } from "@/lib/aset";
import { simpanAset, type KeadaanAset } from "./aksi";

export interface NilaiAset {
  id: string | null;
  kodeAset: string;
  nama: string;
  kategori: string;
  merk: string;
  jumlah: number;
  satuan: string;
  kondisi: string;
  lokasi: string;
  tahunPerolehan: string;
  penanggungJawabId: string;
  bolehDipinjam: boolean;
  keterangan: string;
}

function TombolSimpan({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Menyimpan…" : label}
    </Button>
  );
}

export function FormulirAset({
  nilai,
  anggota,
}: {
  nilai: NilaiAset;
  anggota: { id: string; nama: string }[];
}) {
  const aksi = simpanAset.bind(null, nilai.id);
  const [keadaan, jalankan] = useActionState<KeadaanAset, FormData>(aksi, {});
  const p = (nama: string) => `${nama}-${nilai.id ?? "baru"}`;

  // Hanya formulir penambahan yang dikosongkan setelah berhasil, supaya alat
  // kedua dan ketiga dapat langsung diketikkan. Pada formulir penyuntingan,
  // pengosongan justru membuat kartu yang baru saja diubah tampak kehilangan
  // isinya.
  const ref = useKosongkanSetelahBerhasil(nilai.id ? undefined : keadaan.berhasil);

  return (
    <form ref={ref} action={jalankan} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Kode aset"
          htmlFor={p("kodeAset")}
          wajib
          petunjuk="Dicetak pada label QR. Huruf, angka, dan tanda hubung."
        >
          <Input
            id={p("kodeAset")}
            name="kodeAset"
            defaultValue={nilai.kodeAset}
            className="font-mono uppercase"
            required
          />
        </Field>
        <Field label="Nama aset" htmlFor={p("nama")} wajib>
          <Input id={p("nama")} name="nama" defaultValue={nilai.nama} required />
        </Field>
        <Field label="Kategori" htmlFor={p("kategori")} wajib>
          <Input id={p("kategori")} name="kategori" defaultValue={nilai.kategori} required />
        </Field>
        <Field label="Merk (opsional)" htmlFor={p("merk")}>
          <Input id={p("merk")} name="merk" defaultValue={nilai.merk} />
        </Field>
        <Field label="Jumlah" htmlFor={p("jumlah")}>
          <Input id={p("jumlah")} name="jumlah" type="number" min={1} defaultValue={nilai.jumlah} />
        </Field>
        <Field label="Satuan" htmlFor={p("satuan")}>
          <Input id={p("satuan")} name="satuan" defaultValue={nilai.satuan} />
        </Field>
        <Field label="Kondisi" htmlFor={p("kondisi")}>
          <Select id={p("kondisi")} name="kondisi" defaultValue={nilai.kondisi}>
            {KONDISI_ASET.map((k) => (
              <option key={k} value={k}>
                {k.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Lokasi" htmlFor={p("lokasi")} wajib>
          <Input id={p("lokasi")} name="lokasi" defaultValue={nilai.lokasi} required />
        </Field>
        <Field label="Tahun perolehan (opsional)" htmlFor={p("tahun")}>
          <Input
            id={p("tahun")}
            name="tahunPerolehan"
            type="number"
            min={1980}
            max={2100}
            defaultValue={nilai.tahunPerolehan}
          />
        </Field>
        <Field label="Penanggung jawab (opsional)" htmlFor={p("pj")}>
          <Select id={p("pj")} name="penanggungJawabId" defaultValue={nilai.penanggungJawabId}>
            <option value="">Belum ditentukan</option>
            {anggota.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nama}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Keterangan (opsional)" htmlFor={p("ket")}>
        <TextArea id={p("ket")} name="keterangan" defaultValue={nilai.keterangan} rows={2} />
      </Field>

      <Centang
        name="bolehDipinjam"
        value="ya"
        defaultChecked={nilai.bolehDipinjam}
        label="Boleh dipinjam keluar dari rak"
        keterangan="Matikan untuk alat yang hanya boleh dipakai di dalam laboratorium."
      />

      <TombolSimpan label={nilai.id ? "Simpan perubahan" : "Tambah aset"} />

      <PesanFormulir galat={keadaan.galat} berhasil={keadaan.berhasil} />
    </form>
  );
}
