import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const gayaBadge = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        netral: "bg-dasar text-teks-redup border border-garis",
        utama: "bg-utama-lembut text-utama",
        berhasil: "bg-berhasil-lembut text-berhasil",
        peringatan: "bg-peringatan-lembut text-peringatan",
        bahaya: "bg-bahaya-lembut text-bahaya",
      },
    },
    defaultVariants: { variant: "netral" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof gayaBadge>) {
  return <span className={cn(gayaBadge({ variant }), className)} {...props} />;
}
