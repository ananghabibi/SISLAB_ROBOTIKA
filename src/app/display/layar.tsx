"use client";

import { useEffect, useState } from "react";

interface Orang {
  nama: string;
  squad: string | null;
  jamMasuk: string;
  manual: boolean;
}

const formatJam = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const formatTanggal = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const formatJamMasuk = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function Layar({
  kodeHarian,
  detikPutaran,
  pesanGangguan,
  orangAwal,
  alamatPonsel,
}: {
  kodeHarian: string | null;
  detikPutaran: number;
  pesanGangguan: string | null;
  orangAwal: Orang[];
  /** Alamat yang harus diketik di ponsel; null bila tidak dapat ditentukan. */
  alamatPonsel: string | null;
}) {
  const [sekarang, setSekarang] = useState<Date | null>(null);
  const [putaran, setPutaran] = useState(0);
  const [sisa, setSisa] = useState(detikPutaran);
  const [orang, setOrang] = useState<Orang[]>(orangAwal);
  const [gangguanData, setGangguanData] = useState(false);

  // Jam berjalan di peramban, bukan di peladen. Karena itu ia tetap menyala
  // walau basis data mati — persis yang diminta SPEC bagian 8 soal ketahanan.
  useEffect(() => {
    setSekarang(new Date());
    const denyut = setInterval(() => setSekarang(new Date()), 1000);
    return () => clearInterval(denyut);
  }, []);

  // Hitung mundur putaran QR.
  useEffect(() => {
    const denyut = setInterval(() => {
      setSisa((s) => {
        if (s <= 1) {
          setPutaran((p) => p + 1);
          return detikPutaran;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(denyut);
  }, [detikPutaran]);

  // Daftar orang di lab disegarkan berkala.
  useEffect(() => {
    let batal = false;
    async function segarkan() {
      try {
        const jawaban = await fetch("/api/display/status", { cache: "no-store" });
        if (!jawaban.ok) throw new Error(String(jawaban.status));
        const isi = (await jawaban.json()) as { orang: Orang[] };
        if (!batal) {
          setOrang(isi.orang);
          setGangguanData(false);
        }
      } catch {
        if (!batal) setGangguanData(true);
      }
    }
    const denyut = setInterval(segarkan, 15_000);
    return () => {
      batal = true;
      clearInterval(denyut);
    };
  }, []);

  return (
    <main className="flex min-h-screen flex-col bg-[#0b1017] p-6 text-white lg:p-10">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <p className="text-lg font-semibold tracking-[0.2em] text-sky-300">SILAB</p>
          <p className="text-sm text-slate-400">Laboratorium Robotika · Fakultas Teknik UNISMA</p>
        </div>
        <p className="text-right text-lg text-slate-300">
          {sekarang ? formatTanggal.format(sekarang) : " "}
        </p>
      </header>

      <div className="grid flex-1 items-center gap-8 py-6 lg:grid-cols-[1.1fr_1fr]">
        <section>
          {/* Jam sengaja sangat besar: layar ini dibaca dari seberang ruangan. */}
          <p
            className="font-mono text-[19vw] leading-none font-bold tracking-tight tabular-nums lg:text-[11vw]"
            aria-label="Waktu sekarang"
          >
            {sekarang ? formatJam.format(sekarang) : "--:--:--"}
          </p>
          <p className="mt-1 text-xl text-slate-400">Waktu Indonesia Barat</p>

          <div className="mt-8">
            <p className="text-lg text-slate-400">Kode harian</p>
            {kodeHarian ? (
              <p className="font-mono text-[13vw] leading-none font-bold tracking-[0.15em] text-emerald-300 lg:text-[7vw]">
                {kodeHarian}
              </p>
            ) : (
              <p className="mt-2 max-w-xl rounded-xl bg-amber-500/15 px-4 py-3 text-lg text-amber-200">
                {pesanGangguan ??
                  "Kode harian belum dapat ditampilkan. Hubungi Koordinator Operasional."}
              </p>
            )}
          </div>
        </section>

        <section className="flex flex-col items-center">
          {kodeHarian ? (
            <>
              <div className="rounded-3xl bg-white p-4">
                {/* Berganti tiap putaran; parameter t memaksa peramban mengambil ulang. */}
                <img
                  key={putaran}
                  src={`/api/display/qr?t=${putaran}`}
                  alt="Kode QR absensi"
                  width={340}
                  height={340}
                  className="h-[min(38vh,340px)] w-[min(38vh,340px)]"
                />
              </div>
              <p className="mt-4 text-center text-lg text-slate-300">
                Pindai QR ini, lalu ketik kode harian
              </p>
              <div
                className="mt-2 h-2 w-56 overflow-hidden rounded-full bg-slate-700"
                role="progressbar"
                aria-label="Sisa waktu sebelum QR berganti"
                aria-valuenow={sisa}
                aria-valuemin={0}
                aria-valuemax={detikPutaran}
              >
                <div
                  className="h-full bg-sky-400 transition-[width] duration-1000 ease-linear"
                  style={{ width: `${(sisa / detikPutaran) * 100}%` }}
                />
              </div>
              <p className="mt-1 text-sm text-slate-400">berganti dalam {sisa} detik</p>
            </>
          ) : null}

          {/* Alamat peladen ditampilkan di sini, bukan hanya di terminal
              pengurus. Alamat WiFi berubah sendiri setiap kali laptop
              menyambung ulang, dan yang berdiri di pintu dengan ponsel di
              tangan tidak punya cara lain mengetahui alamat yang berlaku. */}
          {alamatPonsel ? (
            <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-800/60 px-6 py-4 text-center">
              <p className="text-base text-slate-400">Buka di ponsel</p>
              <p className="mt-1 font-mono text-2xl font-bold break-all text-sky-300 lg:text-3xl">
                {alamatPonsel}
              </p>
            </div>
          ) : null}
        </section>
      </div>

      <footer className="border-t border-slate-700 pt-4">
        <div className="flex items-baseline justify-between">
          <p className="text-lg font-semibold text-slate-200">
            Sedang di laboratorium
            <span className="ml-2 text-sky-300">{orang.length}</span>
          </p>
          {gangguanData ? (
            <p className="text-sm text-amber-300">Daftar tidak dapat disegarkan.</p>
          ) : null}
        </div>
        {orang.length === 0 ? (
          <p className="mt-2 text-slate-400">Belum ada yang absen masuk hari ini.</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {orang.map((o) => (
              <li
                key={`${o.nama}-${o.jamMasuk}`}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-base"
              >
                {o.nama}
                {o.squad ? <span className="ml-2 text-slate-400">{o.squad}</span> : null}
                <span className="ml-2 text-slate-500">
                  {formatJamMasuk.format(new Date(o.jamMasuk))}
                </span>
                {o.manual ? <span className="ml-2 text-amber-300">manual</span> : null}
              </li>
            ))}
          </ul>
        )}
      </footer>
    </main>
  );
}
