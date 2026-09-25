"use client";

import { ScrollText } from "lucide-react";
import { PROTOCOLS } from "@/lib/protocols";
import { SeverityBadge } from "@/components/SeverityBadge";
import { PageHeader } from "@/components/PageHeader";

export default function ProtocolsPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Care protocols"
        subtitle="Three fixed follow-up templates. Check-ins are scheduled per protocol; replies are triaged against the rules below."
      />

      <div className="grid gap-5 xl:grid-cols-3">
        {PROTOCOLS.map((p) => (
          <div key={p.id} className="flex flex-col rounded-lg border border-line bg-panel p-5">
            <div className="flex items-center gap-2">
              <ScrollText size={16} className="text-accent" aria-hidden />
              <h2 className="text-[15px] font-semibold tracking-tight text-ink">{p.name}</h2>
            </div>

            <p className="mt-4 text-xs font-semibold text-muted">Check-in schedule</p>
            <ul className="mt-2 space-y-2">
              {p.steps.map((s) => (
                <li key={s.day} className="flex gap-3 rounded-md border border-line-soft bg-panel-raised p-3">
                  <span className="w-14 shrink-0 text-xs font-semibold text-muted">{s.day}</span>
                  <span className="text-sm text-body">{s.instruction}</span>
                </li>
              ))}
            </ul>

            <p className="mt-4 text-xs font-semibold text-muted">Warning signs</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.redFlags.map((f) => (
                <span key={f} className="rounded-md border border-danger/30 bg-danger/5 px-2 py-0.5 text-xs font-medium text-danger">
                  {f}
                </span>
              ))}
            </div>

            <details className="mt-4 flex-1">
              <summary className="cursor-pointer list-none text-xs font-medium text-accent hover:underline [&::-webkit-details-marker]:hidden">
                View routing rules
              </summary>
              <ul className="mt-2 space-y-1.5">
                {p.rules.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 rounded-md border border-line-soft bg-panel-raised px-2.5 py-1.5">
                    <span className="text-xs font-medium text-ink">{r.label}</span>
                    <SeverityBadge severity={r.severity} />
                  </li>
                ))}
              </ul>
            </details>
            <p className="mt-3 border-t border-line-soft pt-3 text-xs text-muted">
              High severity goes to the doctor · low and medium go to the nurse
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
