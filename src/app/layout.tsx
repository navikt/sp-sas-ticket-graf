import type { Metadata } from "next";
import Link from "next/link";
import { RefreshButton } from "@/components/RefreshButton";
import "./globals.css";

export const metadata: Metadata = {
  title: "sas-epics",
  description: "Avhengigheter mellom ticketene i navikt/sas-issues",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="no">
      <body className="min-h-screen bg-slate-100 text-slate-900">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-6">
            <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-900 text-white">
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 7.5 17 11M7 16.5 17 13" strokeLinecap="round" />
                  <circle cx="5" cy="7" r="2.5" fill="currentColor" stroke="none" />
                  <circle cx="5" cy="17" r="2.5" fill="currentColor" stroke="none" />
                  <circle cx="19" cy="12" r="2.5" fill="currentColor" stroke="none" />
                </svg>
              </span>
              sas-epics
            </Link>
            <span className="text-sm text-slate-400">navikt/sas-issues</span>
          </div>
        </header>
        {children}
        <RefreshButton />
      </body>
    </html>
  );
}
