"use client";

import { ScrollText, AlertTriangle } from "lucide-react";
import { PROTOCOLS } from "@/lib/protocols";
import { SeverityBadge } from "@/components/SeverityBadge";
import { PageHeader } from "@/components/PageHeader";

export default function ProtocolsPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Runbooks"
        title="Care Protocols"
        subtitle="Three fixed follow-up templates. Check-ins are scheduled per protocol; replies are triaged against the rules below."
      />

      <div className="grid gap-4 xl:grid-cols-3">
        {PROTOCOLS.map((p, i) => (
          <div key={p.id} className="flex flex-col rounded-lg border border-line bg-panel p-5">
            <div className="flex items-center justify-between">
              <span className="mono-label text-[10px] text-muted">PROTO / {String(i + 1).padStart(2, "0")}</span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
                <span className="mono-label text-[9px] text-accent">Active</span>
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <ScrollText size={15} className="text-accent" aria-hidden />
              <h2 className="text-[15px] font-bold tracking-tight text-ink">{p.name}</h2>
            </div>

            <p className="mono-label mt-4 text-[9px] text-muted">Check-in schedule</p>
            <ul className="mt-2 space-y-2">
              {p.steps.map((s, j) => (
                <li key={s.day} className="flex gap-3 rounded-md border border-line-soft bg-canvas p-2.5">
                  <span className="mono-label w-14 shrink-0 text-[9px] text-accent">{String(j + 1).padStart(2, "0")} · {s.day}</span>
                  <span className="text-[13px] text-body">{s.instruction}</span>
                </li>
              ))}
            </ul>

            <p className="mono-label mt-4 flex items-center gap-1.5 text-[9px] text-muted">
              <AlertTriangle size={11} className="text-danger" aria-hidden /> Red flags
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.redFlags.map((f) => (
                <span key={f} className="mono-label rounded border border-danger/30 bg-danger/10 px-2 py-0.5 text-[9px] text-danger">
                  {f}
                </span>
              ))}
            </div>

            <p className="mono-label mt-4 text-[9px] text-muted">Detection rules</p>
            <ul className="mt-2 flex-1 space-y-1.5">
              {p.rules.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 rounded-md border border-line-soft bg-canvas px-2.5 py-1.5">
                  <span className="mono-label text-[10px] text-ink">{r.id}</span>
                  <SeverityBadge severity={r.severity} />
                </li>
              ))}
            </ul>
            <p className="mono-label mt-3 border-t border-line-soft pt-3 text-[9px] text-muted">
              HIGH → Doctor queue · LOW / MEDIUM → Nurse queue
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
