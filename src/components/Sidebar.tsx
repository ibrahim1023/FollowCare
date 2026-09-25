"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Role } from "@/lib/types";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/patients", label: "Patients" },
  { href: "/nurse-queue", label: "Nurse review" },
  { href: "/doctor-queue", label: "Doctor review" },
  { href: "/protocols", label: "Protocols" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { state, setRole, resetDemo } = useApp();

  const nurseCount = state.alerts.filter((a) => a.assignedRole === "NURSE" && a.status !== "resolved").length;
  const doctorCount = state.alerts.filter((a) => a.assignedRole === "DOCTOR" && a.status !== "resolved").length;

  const countFor = (href: string) =>
    href === "/nurse-queue" ? nurseCount : href === "/doctor-queue" ? doctorCount : 0;

  const isActive = (href: string) => (href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href));

  const controls = (
    <div className="flex items-center gap-3">
      <label htmlFor="role-select" className="sr-only">Viewing as</label>
      <select
        id="role-select"
        value={state.role}
        onChange={(e) => setRole(e.target.value as Role)}
        className="rounded-md border border-line bg-panel px-2 py-1.5 text-xs font-medium text-body focus:border-accent"
      >
        <option value="DOCTOR">Doctor</option>
        <option value="NURSE">Nurse</option>
        <option value="ADMIN">Admin</option>
      </select>
      <button onClick={resetDemo} className="text-xs font-medium text-muted hover:text-accent">
        Reset demo
      </button>
    </div>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-panel shadow-sm">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent">
              <Activity size={15} className="text-on-accent" aria-hidden />
            </span>
            <span className="text-[15px] font-bold tracking-tight text-ink">FollowCare</span>
            <span className="hidden text-xs text-muted lg:block">Clinic follow-up</span>
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {NAV.map(({ href, label }) => {
              const active = isActive(href);
              const count = countFor(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium ${
                    active ? "text-accent" : "text-body hover:text-ink"
                  }`}
                >
                  {label}
                  {count > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
                        href === "/doctor-queue" ? "bg-danger/10 text-danger" : "bg-accent-soft text-accent"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                  {active && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent" aria-hidden />}
                </Link>
              );
            })}
          </nav>
          <div>{controls}</div>
        </div>
        <div className="border-t border-line-soft pb-2 pt-2 md:hidden">
          <nav aria-label="Primary" className="flex gap-1 overflow-x-auto">
            {NAV.map(({ href, label }) => {
              const active = isActive(href);
              const count = countFor(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${
                    active ? "bg-accent-soft text-accent" : "text-body"
                  }`}
                >
                  {label}
                  {count > 0 && (
                    <span className={`rounded-full px-1.5 text-[10px] font-semibold ${href === "/doctor-queue" ? "text-danger" : "text-accent"}`}>
                      {count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
