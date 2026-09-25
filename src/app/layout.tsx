import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

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
          <div className="lg:pl-[236px]">
            <TopBar />
            <main>
              <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-5 lg:px-7">{children}</div>
            </main>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
