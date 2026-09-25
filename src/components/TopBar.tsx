"use client";

import { usePathname } from "next/navigation";

const SECTIONS: Record<string, string> = {
  "/": "Dashboard",
  "/patients": "Patients",
  "/nurse-queue": "Nurse Queue",
  "/doctor-queue": "Doctor Queue",
  "/protocols": "Care Protocols",
};

export function TopBar() {
  const pathname = usePathname();
  const section =
    Object.entries(SECTIONS).find(([href]) =>
      href === "/" ? pathname === "/" : pathname.startsWith(href)
    )?.[1] ?? "Workspace";
  const sub = pathname.startsWith("/patients/") ? "Patient record" : null;

  return (
    <div className="sticky top-0 z-20 hidden h-12 items-center justify-between border-b border-line bg-canvas/95 px-6 lg:flex">
      <div className="flex items-center gap-2 text-xs">
        <span className="mono-label text-[10px] text-muted">Workspace</span>
        <span className="text-muted" aria-hidden>/</span>
        <span className="font-medium text-ink">{section}</span>
        {sub && (
          <>
            <span className="text-muted" aria-hidden>/</span>
            <span className="text-muted">{sub}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
          <span className="mono-label text-[10px] text-body">Groq connected</span>
        </span>
        <span className="mono-label text-[10px] text-muted">Dubai Clinic</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-panel-raised text-[10px] font-bold text-ink" aria-hidden>
          DR
        </span>
      </div>
    </div>
  );
}
