"use client";

// -----------------------------------------------------------------------------
// Kolom kode aset dengan pemindai QR.
//
// Kolom teks tetap ada dan tetap bisa diisi tangan. Label yang sobek, kamera
// yang tidak bisa dibuka, atau ponsel pinjaman yang tidak mengizinkan kamera
// tidak boleh menghentikan pencatatan peminjaman — yang penting alatnya
// tercatat keluar, bukan caranya dipindai.
// -----------------------------------------------------------------------------

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { bacaKodeAset } from "@/lib/aset";
import { pesanGalatKamera } from "@/lib/kamera";

export function PemindaiAset({
  nama = "kodeAset",
  awal = "",
}: {
  nama?: string;
  awal?: string;
}) {
  const idKotak = useId().replace(/:/g, "");
  const [kode, setKode] = useState(awal);
  const [memindai, setMemindai] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const pemindaiRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);

  const hentikan = useCallback(async () => {
    const pemindai = pemindaiRef.current;
    pemindaiRef.current = null;
    setMemindai(false);
    if (!pemindai) return;
    try {
      await pemindai.stop();
      pemindai.clear();
    } catch {
      // Sudah berhenti sendiri.
    }
  }, []);

  // Kamera wajib mati saat komponen dilepas, kalau tidak lampunya tetap menyala.
  useEffect(() => () => void hentikan(), [hentikan]);

  async function mulai() {
    setGalat(null);
    setMemindai(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const pemindai = new Html5Qrcode(idKotak);
      pemindaiRef.current = pemindai;
      await pemindai.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (teks) => {
          const terbaca = bacaKodeAset(teks);
          if (!terbaca) {
            // Kemungkinan besar QR absensi, bukan label aset. Kamera dibiarkan
            // hidup supaya petugas tinggal mengarahkannya ke label yang benar.
            setGalat("QR ini bukan label aset. Arahkan ke stiker QR pada alatnya.");
            return;
          }
          setKode(terbaca);
          setGalat(null);
          void hentikan();
        },
        () => {
          // Dipanggil terus selama belum ada QR di bidikan. Diabaikan.
        },
      );
    } catch (kesalahan) {
      await hentikan();
      setGalat(pesanGalatKamera(kesalahan));
    }
  }

  return (
    <div className="space-y-3">
      <Field label="Kode aset" htmlFor={`${idKotak}-kode`} petunjuk="Pindai label QR atau ketik kodenya.">
        <Input
          id={`${idKotak}-kode`}
          name={nama}
          value={kode}
          onChange={(e) => setKode(e.target.value.toUpperCase())}
          autoCapitalize="characters"
          autoComplete="off"
          placeholder="mis. INV-014"
          required
        />
      </Field>

      {!memindai ? (
        <Button type="button" variant="garis" className="w-full" onClick={mulai}>
          Pindai label QR
        </Button>
      ) : null}

      {/* Wadah pemindai harus tetap di DOM selagi kamera hidup. */}
      <div className={memindai ? "space-y-3" : "hidden"}>
        <div id={idKotak} className="overflow-hidden rounded-xl bg-black" />
        <Button type="button" variant="garis" className="w-full" onClick={() => void hentikan()}>
          Tutup kamera
        </Button>
      </div>

      {galat ? <p className="text-sm text-bahaya">{galat}</p> : null}
    </div>
  );
}
