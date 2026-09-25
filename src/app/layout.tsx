import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "FollowCare",
  description: "Post-visit follow-up and triage workspace for small clinics",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <AppProvider>
          <Sidebar />
          <main>
            <div className="mx-auto max-w-[1320px] px-4 py-7 sm:px-6">{children}</div>
          </main>
        </AppProvider>
      </body>
    </html>
  );
}
