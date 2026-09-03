import * as React from "react";

import { cn } from "@/lib/utils";

const gayaMasukan =
  "w-full rounded-lg border border-garis bg-permukaan px-3 py-2 text-base text-teks placeholder:text-teks-redup/70 disabled:bg-dasar disabled:text-teks-redup";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(gayaMasukan, className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn(gayaMasukan, "pr-8", className)} {...props} />
));
Select.displayName = "Select";

/**
 * Kotak teks panjang.
 *
 * Ada sebagai komponen tersendiri karena sebelumnya seluruh aplikasi memakai
 * `<textarea>` telanjang: tanpa bingkai, tanpa jarak dalam, dan tidak selebar
 * kolom di sekitarnya. Di layar ia terbaca seperti kolom yang rusak — dan
 * kolom yang terlihat rusak membuat orang ragu apakah isiannya tersimpan.
 */
export const TextArea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, rows = 3, ...props }, ref) => (
  <textarea
    ref={ref}
    rows={rows}
    className={cn(gayaMasukan, "resize-y leading-relaxed", className)}
    {...props}
  />
));
TextArea.displayName = "TextArea";

/**
 * Kotak centang beserta labelnya.
 *
 * Seluruh area label ikut dapat ditekan, bukan hanya kotak 20 pikselnya.
 * Absensi dan piket diisi sambil berdiri, kerap dengan satu tangan memegang
 * ponsel — sasaran sentuh sekecil itu berarti orang menekan dua sampai tiga
 * kali untuk satu centang, dan pada checklist delapan butir hal itu terasa.
 */
export function Centang({
  label,
  keterangan,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: React.ReactNode;
  keterangan?: React.ReactNode;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg px-2 py-2 text-sm hover:bg-dasar">
      <input type="checkbox" className={cn("mt-0.5 shrink-0", className)} {...props} />
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        {keterangan ? (
          <span className="mt-0.5 block text-xs text-teks-redup">{keterangan}</span>
        ) : null}
      </span>
    </label>
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("mb-1.5 block text-sm font-medium text-teks", className)} {...props} />
  );
}

export function Field({
  label,
  petunjuk,
  htmlFor,
  wajib,
  children,
}: {
  label: string;
  petunjuk?: string;
  htmlFor?: string;
  /** Menandai kolom wajib dengan tanda bintang pada labelnya. */
  wajib?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      {/* Tanda wajib ditaruh di label, bukan hanya pada atribut `required`
          yang tidak terlihat sampai formulirnya ditolak peramban. */}
      <Label htmlFor={htmlFor} data-wajib={wajib ? "" : undefined}>
        {label}
      </Label>
      {children}
      {petunjuk ? <p className="mt-1 text-xs text-teks-redup">{petunjuk}</p> : null}
    </div>
  );
}
