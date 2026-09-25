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
              className="w-72 rounded-md border border-line bg-panel py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-accent"
            />
          </div>
        }
      />

      <div className="rounded-lg border border-line bg-panel">
        {filtered.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">No patients match “{query}”.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-muted">
                  {["Patient", "Diagnosis", "Follow-up", "Status", "Next check-in"].map((h) => (
                    <th key={h} className="px-5 py-2.5 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {filtered.map((p) => {
                  const visit = state.visits.find((v) => v.patientId === p.id);
                  const pp = state.patientProtocols.find((x) => x.patientId === p.id);
                  const initials = p.name.split(" ").map((n) => n[0]).slice(0, 2).join("");
                  return (
                    <tr key={p.id} className="hover:bg-panel-hover">
                      <td className="px-5 py-3">
                        <Link href={`/patients/${p.id}`} className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-soft text-xs font-semibold text-accent" aria-hidden>
                            {initials}
                          </span>
                          <span>
                            <span className="block font-semibold text-ink hover:text-accent">{p.name}</span>
                            <span className="text-xs text-muted">Age {p.age} · {p.assignedDoctor}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="max-w-64 truncate px-5 py-3 text-body">{visit?.diagnosis ?? "—"}</td>
                      <td className="px-5 py-3 text-body">{pp ? getProtocol(pp.protocolId).name : "—"}</td>
                      <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                      <td className="px-5 py-3 text-body">{pp?.nextCheckin ?? "—"}</td>
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
