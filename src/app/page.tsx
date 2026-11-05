import Link from "next/link";
import { ErrorPanel } from "@/components/ErrorPanel";
import { Progress } from "@/components/Progress";
import { loadEpicGraph, loadEpics } from "@/lib/data";
import { epicTitle } from "@/lib/format";
import { statusStyle } from "@/lib/status-style";
import { STATUSES } from "@/lib/tickets";

export const dynamic = "force-dynamic";

export default async function Home() {
  let overview;
  try {
    const epics = await loadEpics();
    overview = await Promise.all(epics.map(async (epic) => ({ epic, graph: await loadEpicGraph(epic.slug) })));
  } catch (error) {
    return <ErrorPanel error={error} />;
  }

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
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {overview.map(({ epic, graph }) => {
            const total = STATUSES.reduce((sum, it) => sum + graph.counts[it], 0);
            return (
              <li key={epic.slug}>
                <Link
                  href={`/${epic.slug}`}
                  data-testid="epic-card"
                  className="group block h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-semibold text-slate-900 group-hover:text-blue-700">{epicTitle(epic.slug)}</h2>
                    <span className="shrink-0 text-sm tabular-nums text-slate-500">
                      {graph.counts.ferdig}/{total}
                    </span>
                  </div>
                  {epic.description && <p className="mt-1 text-sm text-slate-500">{epic.description}</p>}
                  <Progress counts={graph.counts} className="mt-4" />
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    {STATUSES.filter((it) => graph.counts[it] > 0).map((it) => (
                      <span key={it} className="inline-flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${statusStyle[it].dot}`} />
                        {graph.counts[it]} {statusStyle[it].label.toLowerCase()}
                      </span>
                    ))}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
