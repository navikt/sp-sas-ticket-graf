import Link from "next/link";
import { ErrorPanel } from "@/components/ErrorPanel";
import { Progress } from "@/components/Progress";
import { loadEpicCounts, loadEpics } from "@/lib/data";
import { epicTitle } from "@/lib/format";
import { statusStyle } from "@/lib/status-style";
import { type Epic, isEpicDone, type Status, STATUSES } from "@/lib/tickets";

export const dynamic = "force-dynamic";

type EpicOverview = { epic: Epic; counts: Record<Status, number> };

export default async function Home() {
  let overview: EpicOverview[];
  try {
    const epics = await loadEpics();
    overview = await Promise.all(epics.map(async (epic) => ({ epic, counts: await loadEpicCounts(epic.slug) })));
  } catch (error) {
    return <ErrorPanel error={error} />;
  }

  const active = overview.filter((it) => !isEpicDone(it.counts));
  const done = overview.filter((it) => isEpicDone(it.counts));

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Epicer</h1>
      <p className="mt-2 text-slate-600">
        Velg en epic for å se avhengighetene mellom ticketene og hvor langt dere har kommet.
      </p>

      {overview.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          Fant ingen labels som starter med <code>epic:</code> i navikt/sas-issues.
        </p>
      ) : (
        <>
          <section aria-labelledby="aktive-epicer" className="mt-8">
            <h2 id="aktive-epicer" className="text-lg font-semibold text-slate-900">
              Pågående epicer
            </h2>
            {active.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Alle epicene er ferdige.</p>
            ) : (
              <EpicCards overview={active} testId="aktive-epicer" />
            )}
          </section>

          {done.length > 0 && (
            <details data-testid="ferdige-epicer" className="group/ferdige mt-10">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-lg font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                <svg
                  aria-hidden
                  viewBox="0 0 20 20"
                  className="h-4 w-4 -rotate-90 text-slate-400 transition group-open/ferdige:rotate-0"
                >
                  <path
                    fill="currentColor"
                    d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z"
                  />
                </svg>
                Ferdige epicer ({done.length})
              </summary>
              <EpicCards overview={done} />
            </details>
          )}
        </>
      )}
    </main>
  );
}

function EpicCards({ overview, testId }: { overview: EpicOverview[]; testId?: string }) {
  return (
    <ul data-testid={testId} className="mt-4 grid gap-4 sm:grid-cols-2">
      {overview.map(({ epic, counts }) => {
        const total = STATUSES.reduce((sum, it) => sum + counts[it], 0);
        return (
          <li key={epic.slug}>
            <Link
              href={`/${epic.slug}`}
              data-testid="epic-card"
              className="group block h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-slate-900 group-hover:text-blue-700">{epicTitle(epic.slug)}</h3>
                <span className="shrink-0 text-sm tabular-nums text-slate-500">
                  {counts.ferdig}/{total}
                </span>
              </div>
              {epic.description && <p className="mt-1 text-sm text-slate-500">{epic.description}</p>}
              <Progress counts={counts} className="mt-4" />
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                {STATUSES.filter((it) => counts[it] > 0).map((it) => (
                  <span key={it} className="inline-flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${statusStyle[it].dot}`} />
                    {counts[it]} {statusStyle[it].label.toLowerCase()}
                  </span>
                ))}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
