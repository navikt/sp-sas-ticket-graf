import { statusStyle } from "@/lib/status-style";
import type { Status } from "@/lib/tickets";

export function StatusBadge({ status }: { status: Status }) {
  const style = statusStyle[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${style.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden />
      {style.label}
    </span>
  );
}
