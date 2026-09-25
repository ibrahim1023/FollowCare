"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/") return <main>{children}</main>;
  return (
    <>
      <Sidebar />
      <main>
        <div className="mx-auto max-w-[1320px] px-4 py-7 sm:px-6">{children}</div>
      </main>
    </>
  );
}
