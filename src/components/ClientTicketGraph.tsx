"use client";

import dynamic from "next/dynamic";

// React Flow measures the DOM and the MiniMap renders browser-specific attributes, so server rendering only causes hydration mismatches.
export const ClientTicketGraph = dynamic(() => import("./TicketGraph").then((it) => it.TicketGraph), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-sm text-slate-400" data-testid="graph-loading">
      Tegner grafen …
    </div>
  ),
});
