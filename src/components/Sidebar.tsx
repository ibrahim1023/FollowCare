"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Stethoscope,
  ScrollText,
  RotateCcw,
  Activity,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Role } from "@/lib/types";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/nurse-queue", label: "Nurse Queue", icon: ClipboardList },
  { href: "/doctor-queue", label: "Doctor Queue", icon: Stethoscope },
  { href: "/protocols", label: "Care Protocols", icon: ScrollText },
];

const ROLES: { value: Role; label: string }[] = [
  { value: "DOCTOR", label: "Doctor" },
  { value: "NURSE", label: "Nurse" },
  { value: "ADMIN", label: "Admin" },
];

function navHint(href: string, role: Role): string | null {
  if (href === "/nurse-queue" && role === "DOCTOR") return "Nurse view";
  if (href === "/doctor-queue" && role === "NURSE") return "Doctor view";
  return null;
}

export function Sidebar() {
  const pathname = usePathname();
  const { state, setRole, resetDemo } = useApp();

  const nurseCount = state.alerts.filter((a) => a.assignedRole === "NURSE" && a.status !== "resolved").length;
  const doctorCount = state.alerts.filter((a) => a.assignedRole === "DOCTOR" && a.status !== "resolved").length;

  const links = (
    <nav aria-label="Primary" className="flex flex-col gap-0.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        const hint = navHint(href, state.role);
        const count = href === "/nurse-queue" ? nurseCount : href === "/doctor-queue" ? doctorCount : 0;
        return (
          <Link
            key={href}
            href={href}
            className={`relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors ${
              active ? "bg-panel-raised text-accent" : "text-body hover:bg-panel-raised hover:text-ink"
            }`}
          >
            {active && <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent" aria-hidden />}
            <Icon size={15} aria-hidden className={active ? "text-accent" : "text-muted"} />
            <span className="flex-1">{label}</span>
            {hint && <span className="mono-label text-[9px] text-muted">{hint}</span>}
            {count > 0 && (
              <span
                className={`mono-label rounded px-1.5 py-0.5 text-[10px] leading-none ${
                  href === "/doctor-queue" ? "bg-danger/10 text-danger" : "bg-accent-soft text-accent"
                }`}
              >
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const roleSwitcher = (
    <div>
      <p className="mono-label mb-1.5 text-[9px] text-muted">Viewing as</p>
      <div className="flex rounded-md border border-line bg-panel p-0.5" role="group" aria-label="Role switcher">
        {ROLES.map((r) => (
          <button
            key={r.value}
            onClick={() => setRole(r.value)}
            aria-pressed={state.role === r.value}
            className={`mono-label flex-1 rounded px-2 py-1.5 text-[10px] transition-colors ${
              state.role === r.value ? "bg-accent-soft text-accent" : "text-muted hover:text-body"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );

  const statusIndicator = (
    <div className="flex items-center gap-2">
      <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
      <span className="mono-label text-[9px] text-muted">System online</span>
    </div>
  );

  const resetButton = (
    <button
      onClick={resetDemo}
      className="flex w-full items-center justify-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent/40 hover:text-ink"
    >
      <RotateCcw size={13} aria-hidden />
      Reset demo
    </button>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[236px] flex-col border-r border-line bg-canvas px-3 py-5 lg:flex">
        <Link href="/" className="mb-7 flex items-center gap-2.5 px-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-line">
            <Activity size={14} className="text-accent" aria-hidden />
          </span>
          <span>
            <span className="block text-[13px] font-bold leading-none tracking-tight text-ink">FOLLOWCARE</span>
            <span className="mono-label mt-1 block text-[8px] text-muted">Follow-up copilot</span>
          </span>
        </Link>
        <p className="mono-label mb-2 px-3 text-[9px] text-muted">Workspace</p>
        {links}
        <div className="mt-auto flex flex-col gap-4 px-1">
          {statusIndicator}
          {roleSwitcher}
          {resetButton}
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-line bg-canvas px-4 py-2.5 lg:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded border border-line">
              <Activity size={12} className="text-accent" aria-hidden />
            </span>
            <p className="text-[13px] font-bold tracking-tight text-ink">FOLLOWCARE</p>
          </div>
          <div className="flex rounded-md border border-line bg-panel p-0.5" role="group" aria-label="Role switcher">
            {ROLES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRole(r.value)}
                aria-pressed={state.role === r.value}
                className={`mono-label rounded px-2 py-1 text-[9px] ${
                  state.role === r.value ? "bg-accent-soft text-accent" : "text-muted"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2.5 flex gap-1 overflow-x-auto pb-1">
          {NAV.map(({ href, label }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-medium ${
                  active ? "bg-panel-raised text-accent" : "text-body"
                }`}
              >
                {label}
              </Link>
            );
          })}
          <button
            onClick={resetDemo}
            className="ml-auto whitespace-nowrap rounded-md border border-line px-2.5 py-1 text-[11px] font-medium text-muted"
          >
            Reset demo
          </button>
        </div>
      </header>
    </>
  );
}
