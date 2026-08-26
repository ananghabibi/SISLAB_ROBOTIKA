import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const gayaTombol = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-55",
  {
    variants: {
      variant: {
        utama: "bg-utama text-white hover:bg-utama-terang",
        garis: "border border-garis bg-permukaan text-teks hover:bg-utama-lembut",
        halus: "bg-utama-lembut text-utama hover:bg-utama-lembut/70",
        bahaya: "bg-bahaya text-white hover:bg-bahaya/90",
        polos: "text-utama underline-offset-4 hover:underline",
      },
      size: {
        sedang: "min-h-11 px-4 py-2",
        besar: "min-h-14 px-6 text-base",
        kecil: "min-h-11 px-3",
      },
    },
    defaultVariants: { variant: "utama", size: "sedang" },
  },
);

export interface PropsTombol
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof gayaTombol> {}

export const Button = React.forwardRef<HTMLButtonElement, PropsTombol>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(gayaTombol({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";

export { gayaTombol };
