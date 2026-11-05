import { statusStyle } from "@/lib/status-style";
import { STATUSES, type Status } from "@/lib/tickets";

export function Progress({ counts, className = "" }: { counts: Record<Status, number>; className?: string }) {
  const total = STATUSES.reduce((sum, it) => sum + counts[it], 0);

  return (
    <div
      className={`flex h-2 overflow-hidden rounded-full bg-slate-200 ${className}`}
      role="img"
      aria-label={`${counts.ferdig} av ${total} ferdig`}
    >
      {total > 0 &&
        STATUSES.map((it) =>
          counts[it] > 0 ? (
            <span
              key={it}
              className={statusStyle[it].dot}
              style={{ width: `${(counts[it] / total) * 100}%` }}
            />
          ) : null,
        )}
    </div>
  );
}
