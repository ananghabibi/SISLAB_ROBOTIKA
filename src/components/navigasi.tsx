"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";
import type { ButirMenu } from "@/lib/menu";

interface Props {
  kelompok: { kelompok: string; butir: ButirMenu[] }[];
  nama: string;
  peran: string;
  squad: string | null;
  tombolKeluar: React.ReactNode;
}

export function Navigasi({ kelompok, nama, peran, squad, tombolKeluar }: Props) {
  const [terbuka, setTerbuka] = useState(false);
  const jalur = usePathname();

  const aktif = (href: string) =>
    jalur === href || (href !== "/dasbor" && jalur.startsWith(`${href}/`));

  const daftar = (
    <nav className="space-y-5">
      {kelompok.map((k) => (
        <div key={k.kelompok}>
          <p className="px-3 pb-1 text-xs font-semibold tracking-wide text-teks-redup uppercase">
            {k.kelompok}
          </p>
          <ul className="space-y-0.5">
            {k.butir.map((b) => (
              <li key={b.href}>
                <Link
                  href={b.href}
                  onClick={() => setTerbuka(false)}
                  aria-current={aktif(b.href) ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center rounded-lg px-3 text-sm font-medium",
                    aktif(b.href)
                      ? "bg-utama text-white"
                      : "text-teks hover:bg-utama-lembut hover:text-utama",
                  )}
                >
                  {b.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Bilah atas — satu-satunya navigasi yang terlihat di ponsel. */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-garis bg-permukaan px-4 py-2 lg:hidden">
        <button
          type="button"
          onClick={() => setTerbuka((t) => !t)}
          aria-expanded={terbuka}
          aria-controls="menu-utama"
          className="min-h-11 min-w-11 rounded-lg border border-garis px-3 text-sm font-semibold"
        >
          {terbuka ? "Tutup" : "Menu"}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{nama}</p>
          <p className="truncate text-xs text-teks-redup">
            {peran}
            {squad ? ` · ${squad}` : ""}
          </p>
        </div>
      </header>

      {terbuka ? (
        <div id="menu-utama" className="border-b border-garis bg-permukaan p-3 lg:hidden">
          {daftar}
          <div className="mt-4 border-t border-garis pt-3">{tombolKeluar}</div>
        </div>
      ) : null}

      {/* Bilah samping — hanya di layar lebar. */}
      <aside className="hidden w-64 shrink-0 border-r border-garis bg-permukaan lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto">
        <div className="border-b border-garis px-4 py-4">
          <p className="text-sm font-bold tracking-wide text-utama">SILAB</p>
          <p className="mt-2 truncate text-sm font-semibold">{nama}</p>
          <p className="truncate text-xs text-teks-redup">{peran}</p>
          {squad ? <p className="truncate text-xs text-teks-redup">{squad}</p> : null}
        </div>
        <div className="p-3">{daftar}</div>
        <div className="border-t border-garis p-3">{tombolKeluar}</div>
      </aside>
    </>
  );
}
