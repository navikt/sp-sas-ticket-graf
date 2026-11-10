"use client";

import { useTransition } from "react";
import { refreshFromGitHub } from "@/app/actions";

export function RefreshButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => refreshFromGitHub())}
      disabled={pending}
      title="Svarene fra GitHub mellomlagres i 10 minutter. Klikk for å hente på nytt nå."
      className="fixed bottom-3 right-4 z-30 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-slate-400 transition hover:bg-white hover:text-slate-700 hover:shadow-sm disabled:cursor-wait"
    >
      <svg
        viewBox="0 0 24 24"
        className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`}
        aria-hidden
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        <path d="M21 3v6h-6" />
      </svg>
      {pending ? "Henter …" : "Hent på nytt"}
    </button>
  );
}
