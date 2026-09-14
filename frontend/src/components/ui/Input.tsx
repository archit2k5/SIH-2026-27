import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Label({ className, ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("block text-[12px] font-medium text-text-secondary mb-1.5", className)}
      {...rest}
    />
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-sm border border-border bg-surface px-3 py-2 text-[14px] text-text-primary placeholder:text-text-secondary/70 outline-none transition-colors focus:border-secondary disabled:opacity-50",
        className
      )}
      {...rest}
    />
  );
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-sm border border-border bg-surface px-3 py-2 text-[14px] text-text-primary placeholder:text-text-secondary/70 outline-none transition-colors focus:border-secondary disabled:opacity-50",
        className
      )}
      {...rest}
    />
  );
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-sm border border-border bg-surface px-3 py-2 text-[14px] text-text-primary outline-none transition-colors focus:border-secondary disabled:opacity-50",
        className
      )}
      {...rest}
    >
      {children}
    </select>
  );
}
