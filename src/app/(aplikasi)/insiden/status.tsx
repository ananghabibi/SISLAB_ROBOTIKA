"use client";

import { Fragment, useActionState } from "react";

import { Field, Select } from "@/components/ui/field";
import { LABEL_STATUS_TINDAK_LANJUT, STATUS_TINDAK_LANJUT } from "@/lib/insiden";
import { ubahStatusInsiden, type KeadaanInsiden } from "./aksi";
import { TombolStatus } from "./formulir";

/**
 * Pengubah status tindak lanjut.
 *
 * Hanya dirender bagi yang berwenang; peladen tetap memeriksa ulang. Menyembunyikan
 * kendali bukan pengamanan.
 */
export function UbahStatus({ insidenId, status }: { insidenId: string; status: string }) {
  const [keadaan, kirim] = useActionState<KeadaanInsiden, FormData>(ubahStatusInsiden, {});

  return (
    <form action={kirim} className="mt-3 flex flex-wrap items-end gap-2">
      <input type="hidden" name="insidenId" value={insidenId} />
      {/* Dipasang ulang saat status dari peladen berubah, agar pilihan
          tersimpan tidak tampak kembali ke status lama setelah menyimpan. */}
      <Fragment key={status}>
        <Field label="Tindak lanjut" htmlFor={`status-${insidenId}`}>
          <Select id={`status-${insidenId}`} name="status" defaultValue={status}>
            {STATUS_TINDAK_LANJUT.map((s) => (
              <option key={s} value={s}>
                {LABEL_STATUS_TINDAK_LANJUT[s]}
              </option>
            ))}
          </Select>
        </Field>
      </Fragment>
      <TombolStatus label="Simpan" />
      {keadaan.galat ? <p className="text-xs text-bahaya">{keadaan.galat}</p> : null}
      {keadaan.berhasil ? <p className="text-xs text-berhasil">{keadaan.berhasil}</p> : null}
    </form>
  );
}
