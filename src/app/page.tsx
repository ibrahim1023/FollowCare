import Link from "next/link";
import { Activity, ArrowRight, CheckCircle2 } from "lucide-react";

const previewRows = [
  { name: "Aisha Rahman", status: "Routine nurse review", dot: "bg-emerald-400", chip: "text-emerald-600", label: "Low" },
  { name: "Omar Al Mansoori", status: "Follow-up needed", dot: "bg-warning", chip: "text-warning", label: "Medium" },
  { name: "Khalid Nasser", status: "Doctor attention", dot: "bg-danger", chip: "text-danger", label: "High" },
];

const checks = [
  "Automated patient check-ins",
  "Deterministic severity and routing",
  "Nurse and doctor review before closure",
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col overflow-hidden bg-canvas">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent">
              <Activity size={15} className="text-on-accent" aria-hidden />
            </span>
            <span className="text-[15px] font-bold tracking-tight text-ink">FollowCare</span>
            <span className="hidden text-xs text-muted lg:block">Clinic follow-up</span>
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md bg-accent px-3.5 py-1.5 text-sm font-semibold text-on-accent hover:bg-accent-deep"
          >
            Open workspace
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center">
        <div className="mx-auto grid w-full max-w-[1200px] items-center gap-10 px-4 py-8 sm:px-6 md:grid-cols-2 md:py-10">
          <div>
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent shadow-sm">
                <Activity size={24} className="text-on-accent" aria-hidden />
              </span>
              <div>
                <p className="text-3xl font-bold tracking-tight text-ink">FollowCare</p>
                <p className="text-sm text-muted">Clinic follow-up</p>
              </div>
            </div>
            <p className="text-sm font-semibold text-accent">Post-visit care, without constant monitoring</p>
            <h1 className="mt-3 text-[34px] font-semibold leading-tight tracking-tight text-ink md:text-[42px]">
              Know who needs attention before the next visit.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-body md:text-[17px]">
              FollowCare checks in with patients after a consultation, routes routine replies to nurses, and brings
              doctors in only when clinical rules detect a reason to act.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent hover:bg-accent-deep"
              >
                Open live workspace <ArrowRight size={15} aria-hidden />
              </Link>
              <Link href="/patients/p-aisha" className="text-sm font-medium text-muted hover:text-accent">
                View patient workflow
              </Link>
            </div>
            <ul className="mt-6 space-y-2">
              {checks.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-body">
                  <CheckCircle2 size={15} className="shrink-0 text-accent" aria-hidden /> {item}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs text-muted">Synthetic demo data · Not a medical device</p>
          </div>

          <div className="hidden rounded-lg border border-line bg-panel p-5 shadow-sm md:block">
            <div className="-m-5 mb-0 flex items-center justify-between rounded-t-lg border-b border-line bg-accent-soft px-5 py-3">
              <p className="text-sm font-semibold text-ink">Today’s follow-up</p>
              <span className="text-xs font-medium text-accent-deep">3 need review</span>
            </div>
            <ul className="mt-4 divide-y divide-line-soft">
              {previewRows.map((r) => (
                <li key={r.name} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`h-2 w-2 rounded-full ${r.dot}`} aria-hidden />
                    <div>
                      <p className="text-sm font-semibold text-ink">{r.name}</p>
                      <p className="text-xs text-muted">{r.status}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold ${r.chip}`}>{r.label}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-line-soft pt-3 text-xs text-muted">
              The doctor sees only the cases that need a decision.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
