import { ReactNode } from "react";

export function PageHeader({ eyebrow, title, subtitle, aside }: { eyebrow: string; title: string; subtitle?: string; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mono-label text-[11px] text-accent">{eyebrow}</p>
        <h1 className="mt-1.5 text-[26px] font-bold leading-tight tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {aside}
    </div>
  );
}
