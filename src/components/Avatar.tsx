"use client";

import { useState } from "react";
import type { Assignee } from "@/lib/tickets";

export function Avatar({ assignee }: { assignee: Assignee }) {
  const [failed, setFailed] = useState(false);
  const initials = assignee.login.slice(0, 2).toUpperCase();

  return (
    <span
      title={assignee.login}
      className="inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-sky-100 text-[10px] font-semibold text-sky-800 ring-2 ring-white"
    >
      {assignee.avatarUrl && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- small avatars inside the graph canvas
        <img
          src={`${assignee.avatarUrl}${assignee.avatarUrl.includes("?") ? "&" : "?"}s=48`}
          alt={assignee.login}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initials
      )}
    </span>
  );
}
