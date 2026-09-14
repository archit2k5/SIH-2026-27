import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-hover active:bg-primary-active disabled:opacity-40",
  secondary:
    "bg-transparent text-primary border border-primary hover:bg-primary/5 active:bg-primary/10 disabled:opacity-40",
  danger:
    "bg-danger text-white hover:bg-[#961f19] active:bg-[#7c1a15] disabled:opacity-40",
  ghost:
    "bg-transparent text-text-secondary hover:bg-black/5 active:bg-black/10 disabled:opacity-40",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-[13px] px-3 py-1.5 gap-1.5",
  md: "text-[14px] px-4 py-2 gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-sm font-medium transition-colors duration-150 whitespace-nowrap disabled:cursor-not-allowed disabled:hover:bg-none",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
