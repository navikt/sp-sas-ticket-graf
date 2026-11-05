import { formatDate } from "@/lib/format";
import type { Phase } from "@/lib/phases";

const marker = {
  ferdig: "border-emerald-600 bg-emerald-600 text-white",
  pågår: "border-sky-500 bg-white text-sky-600",
  "ikke startet": "border-slate-300 bg-white text-slate-400",
} as const;

export function PhaseSteps({ phases }: { phases: Phase[] }) {
  const inferred = phases.some((it) => it.inferred);

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <div className="mb-3 flex items-baseline gap-2 text-sm">
        <span className="font-medium text-slate-700">Faser</span>
        {inferred && (
          <span className="text-xs text-slate-400">
            Utledet fra utrullingene, siden issuene ikke har <code>**Fase:**</code>
          </span>
        )}
      </div>
      <ol className="flex flex-wrap items-start gap-y-3" aria-label="Faser">
        {phases.map((phase, index) => (
          <li
            key={phase.key}
            data-testid="phase-step"
            data-status={phase.status}
            className="flex min-w-0 max-w-[26rem] flex-1 items-start"
          >
            <div className="flex min-w-0 items-start gap-2.5">
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold ${marker[phase.status]}`}
              >
                {phase.status === "ferdig" ? "✓" : phase.key}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-800" title={phase.name ?? undefined}>
                  Fase {phase.key}
                  {phase.name && <span className="font-normal text-slate-500"> · {phase.name}</span>}
                </div>
                <div className="text-xs tabular-nums text-slate-500">
                  {phase.status === "ferdig" && phase.finishedAt
                    ? `Ferdig ${formatDate(phase.finishedAt)}`
                    : `${phase.done} av ${phase.total} ferdig`}
                </div>
              </div>
            </div>
            {index < phases.length - 1 && (
              <span
                aria-hidden
                className={`mx-3 mt-3.5 h-0.5 min-w-4 flex-1 rounded ${phase.status === "ferdig" ? "bg-emerald-500" : "bg-slate-200"}`}
              />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
