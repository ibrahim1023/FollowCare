import { ReactNode } from "react";

export function PageHeader({ eyebrow, title, subtitle, aside }: { eyebrow?: string; title: string; subtitle?: string; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="text-xs font-semibold text-accent">{eyebrow}</p>}
        <h1 className="mt-0.5 text-[28px] font-semibold leading-tight tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {aside}
    </div>
  );
}
