"use client";

import { Fragment, useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { PesanFormulir } from "@/components/ui/umpan-balik";
import { simpanPeriode, type KeadaanPeriode } from "./aksi";

export interface NilaiPeriode {
  id: string | null;
  nama: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  targetHadir: number;
  targetSesiBerbagi: number;
  targetPiket: number;
  targetLogbook: number;
  ambangLulus: number;
  aktif: boolean;
}

function TombolSimpan({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Menyimpan…" : label}
    </Button>
  );
}

export function FormulirPeriode({ nilai }: { nilai: NilaiPeriode }) {
  const aksi = simpanPeriode.bind(null, nilai.id);
  const [keadaan, jalankan] = useActionState<KeadaanPeriode, FormData>(aksi, {});

  // Lihat FormulirAset: kunci ini memasang ulang medan setelah props menyegar,
  // supaya suntingan tersimpan tidak tampak kembali ke nilai lama.
  const kunciMedan = JSON.stringify(nilai);

  return (
    <form action={jalankan} className="space-y-4">
      <Fragment key={kunciMedan}>
      <Field label="Nama periode" htmlFor={`nama-${nilai.id ?? "baru"}`}>
        <Input
          id={`nama-${nilai.id ?? "baru"}`}
          name="nama"
          defaultValue={nilai.nama}
          placeholder="Semester Ganjil TA 2026/2027"
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tanggal mulai" htmlFor={`mulai-${nilai.id ?? "baru"}`}>
          <Input
            id={`mulai-${nilai.id ?? "baru"}`}
            name="tanggalMulai"
            type="date"
            defaultValue={nilai.tanggalMulai}
            required
          />
        </Field>
        <Field label="Tanggal selesai" htmlFor={`selesai-${nilai.id ?? "baru"}`}>
          <Input
            id={`selesai-${nilai.id ?? "baru"}`}
            name="tanggalSelesai"
            type="date"
            defaultValue={nilai.tanggalSelesai}
            required
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Target hadir" htmlFor={`hadir-${nilai.id ?? "baru"}`} petunjuk="hari">
          <Input
            id={`hadir-${nilai.id ?? "baru"}`}
            name="targetHadir"
            type="number"
            min={0}
            defaultValue={nilai.targetHadir}
          />
        </Field>
        <Field label="Target sesi berbagi" htmlFor={`berbagi-${nilai.id ?? "baru"}`} petunjuk="sesi">
          <Input
            id={`berbagi-${nilai.id ?? "baru"}`}
            name="targetSesiBerbagi"
            type="number"
            min={0}
            defaultValue={nilai.targetSesiBerbagi}
          />
        </Field>
        <Field label="Target piket" htmlFor={`piket-${nilai.id ?? "baru"}`} petunjuk="kali">
          <Input
            id={`piket-${nilai.id ?? "baru"}`}
            name="targetPiket"
            type="number"
            min={0}
            defaultValue={nilai.targetPiket}
          />
        </Field>
        <Field label="Target logbook" htmlFor={`logbook-${nilai.id ?? "baru"}`} petunjuk="entri">
          <Input
            id={`logbook-${nilai.id ?? "baru"}`}
            name="targetLogbook"
            type="number"
            min={0}
            defaultValue={nilai.targetLogbook}
          />
        </Field>
      </div>

      <Field
        label="Ambang kelulusan"
        htmlFor={`ambang-${nilai.id ?? "baru"}`}
        petunjuk="Skor minimal 0–100 untuk dianggap memenuhi. Bawaan 70."
      >
        <Input
          id={`ambang-${nilai.id ?? "baru"}`}
          name="ambangLulus"
          type="number"
          min={0}
          max={100}
          defaultValue={nilai.ambangLulus}
          className="max-w-40"
        />
      </Field>

      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          name="aktif"
          value="ya"
          defaultChecked={nilai.aktif}
          className="h-5 min-h-0 w-5 shrink-0"
        />
        Jadikan periode yang sedang berjalan
      </label>
      <p className="text-xs text-teks-redup">
        Target nol berarti komponen itu tidak disyaratkan pada periode ini, dan dianggap terpenuhi —
        bukan dihitung nol.
      </p>

      </Fragment>

      <TombolSimpan label={nilai.id ? "Simpan perubahan" : "Buat periode"} />

      <PesanFormulir galat={keadaan.galat} berhasil={keadaan.berhasil} />
    </form>
  );
}
