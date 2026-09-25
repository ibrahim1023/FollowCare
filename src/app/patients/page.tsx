"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { getProtocol } from "@/lib/protocols";
import { StatusBadge } from "@/components/SeverityBadge";
import { PageHeader } from "@/components/PageHeader";

export default function PatientsPage() {
  const { state } = useApp();
  const [query, setQuery] = useState("");

  const filtered = state.patients.filter((p) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const visit = state.visits.find((v) => v.patientId === p.id);
    return (
      p.name.toLowerCase().includes(q) ||
      (visit?.diagnosis ?? "").toLowerCase().includes(q) ||
      p.assignedDoctor.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Registry"
        title="Patients"
        subtitle={`${state.patients.length} patients under follow-up care`}
        aside={
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
            <label htmlFor="patient-search" className="sr-only">Search patients</label>
            <input
              id="patient-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, diagnosis, doctor..."
              className="w-72 rounded-md border border-line bg-panel py-2 pl-9 pr-12 text-[13px] text-ink placeholder:text-muted focus:border-accent"
            />
            <kbd className="mono-label pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-line bg-canvas px-1.5 py-0.5 text-[9px] text-muted">
              ⌘ K
            </kbd>
          </div>
        }
      />

      <div className="rounded-lg border border-line bg-panel">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="mono-label text-[10px] text-muted">Patient registry</p>
          <p className="mono-label text-[9px] text-muted">
            {filtered.length} result{filtered.length === 1 ? "" : "s"}
          </p>
        </div>
        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">No patients match “{query}”.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line bg-panel-raised">
                  {["Patient", "Assigned doctor", "Diagnosis", "Protocol", "Status", "Alerts"].map((h) => (
                    <th key={h} className="mono-label px-4 py-2.5 text-[10px] font-semibold text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {filtered.map((p) => {
                  const visit = state.visits.find((v) => v.patientId === p.id);
                  const pp = state.patientProtocols.find((x) => x.patientId === p.id);
                  const activeAlerts = state.alerts.filter((a) => a.patientId === p.id && a.status !== "resolved").length;
                  const initials = p.name.split(" ").map((n) => n[0]).slice(0, 2).join("");
                  return (
                    <tr key={p.id} className="hover:bg-panel-hover">
                      <td className="px-4 py-2.5">
                        <Link href={`/patients/${p.id}`} className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-panel-raised text-[10px] font-bold text-body" aria-hidden>
                            {initials}
                          </span>
                          <span>
                            <span className="block font-semibold text-ink hover:text-accent">{p.name}</span>
                            <span className="mono-label text-[9px] text-muted">Age {p.age}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-body">{p.assignedDoctor}</td>
                      <td className="max-w-56 truncate px-4 py-2.5 text-body">{visit?.diagnosis ?? "—"}</td>
                      <td className="px-4 py-2.5 text-body">{pp ? getProtocol(pp.protocolId).name : "—"}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-2.5">
                        {activeAlerts > 0 ? (
                          <span className="mono-label text-[10px] text-warning">{activeAlerts} open</span>
                        ) : (
                          <span className="mono-label text-[10px] text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
