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

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("mb-1.5 block text-sm font-medium text-teks", className)} {...props} />
  );
}

export function Field({
  label,
  petunjuk,
  htmlFor,
  children,
}: {
  label: string;
  petunjuk?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {petunjuk ? <p className="mt-1 text-xs text-teks-redup">{petunjuk}</p> : null}
    </div>
  );
}
