import type { ReactNode } from "react";

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <span
      className={`inline-block rounded-full border-2 border-border border-t-primary animate-spin ${className}`}
    />
  );
}

export function PageSpinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-text-secondary">
      <Spinner className="h-6 w-6" />
      <span className="text-[13px]">{label}</span>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border py-14 px-6 text-center">
      {icon && <div className="text-text-secondary mb-1">{icon}</div>}
      <p className="text-[15px] font-medium text-text-primary">{title}</p>
      {description && <p className="text-[13px] text-text-secondary max-w-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-sm border border-danger/30 bg-danger/5 px-4 py-3 text-[13px] text-danger">
      {message}
    </div>
  );
}
