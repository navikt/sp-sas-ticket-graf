"use client";

import { useRouter } from "next/navigation";
import { epicTitle } from "@/lib/format";
import type { Epic } from "@/lib/tickets";

export function EpicPicker({ epics, current }: { epics: Epic[]; current: string }) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      <span className="hidden sm:inline">Epic</span>
      <span className="relative">
        <select
          aria-label="Velg epic"
          value={current}
          onChange={(event) => router.push(`/${event.target.value}`)}
          className="appearance-none rounded-lg border border-slate-300 bg-white py-1.5 pl-3 pr-9 text-sm font-medium text-slate-900 shadow-sm outline-none transition hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        >
          {epics.map((it) => (
            <option key={it.slug} value={it.slug}>
              {epicTitle(it.slug)}
            </option>
          ))}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        >
          <path fill="currentColor" d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
        </svg>
      </span>
    </label>
  );
}
