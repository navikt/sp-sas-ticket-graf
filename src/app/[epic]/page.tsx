import { notFound } from "next/navigation";
import { ClientTicketGraph } from "@/components/ClientTicketGraph";
import { EpicPicker } from "@/components/EpicPicker";
import { ErrorPanel } from "@/components/ErrorPanel";
import { PhaseSteps } from "@/components/PhaseSteps";
import { Progress } from "@/components/Progress";
import { IssueTitle } from "@/components/IssueTitle";
import { StatusBadge } from "@/components/StatusBadge";
import { loadEpicGraph, loadEpics } from "@/lib/data";
import { toFlow } from "@/lib/flow";
import { epicTitle, formatDate } from "@/lib/format";
import { layoutGraph } from "@/lib/layout";
import { statusStyle } from "@/lib/status-style";
import { STATUSES } from "@/lib/tickets";

export const dynamic = "force-dynamic";

const ISSUES_URL = "https://github.com/navikt/sas-issues/issues";

export default async function EpicPage({ params }: { params: Promise<{ epic: string }> }) {
  const { epic } = await params;

  let data;
  try {
    const [epics, graph] = await Promise.all([loadEpics(), loadEpicGraph(epic)]);
    data = { epics, graph, layout: await layoutGraph(graph) };
  } catch (error) {
    return <ErrorPanel error={error} />;
  }
  const { epics, graph, layout } = data;
  const current = epics.find((it) => it.slug === epic);
  if (!current) notFound();

  const { nodes, edges } = toFlow(graph, layout);
  const own = graph.tickets.filter((it) => !it.external);
  const total = own.length;

  return (
    <main className="mx-auto flex max-w-[1600px] flex-col gap-5 px-6 py-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{graph.spec?.title ?? epicTitle(epic)}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {graph.spec ? (
              <a className="text-blue-700 hover:underline" href={graph.spec.url} target="_blank" rel="noreferrer">
                Spec #{graph.spec.number}
              </a>
            ) : (
              (current.description ?? `epic:${epic}`)
            )}{" "}
            ·{" "}
            <a
              className="text-blue-700 hover:underline"
              href={`${ISSUES_URL}?q=${encodeURIComponent(`label:"epic:${epic}"`)}`}
              target="_blank"
              rel="noreferrer"
            >
              Se issuene på GitHub
            </a>
          </p>
        </div>
        <EpicPicker epics={epics} current={epic} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="min-w-48 flex-1">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium text-slate-700">Framdrift</span>
              <span className="tabular-nums text-slate-500" data-testid="progress-label">
                {graph.counts.ferdig} av {total} ferdig
              </span>
            </div>
            <Progress counts={graph.counts} className="mt-2" />
          </div>
          <ul className="flex flex-wrap gap-2" aria-label="Statuser">
            {STATUSES.map((it) => (
              <li
                key={it}
                data-testid={`count-${it}`}
                title={statusStyle[it].description}
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-sm"
              >
                <span className={`h-2.5 w-2.5 rounded-full ${statusStyle[it].dot}`} />
                <span className="text-slate-600">{statusStyle[it].label}</span>
                <span className="font-semibold tabular-nums text-slate-900">{graph.counts[it]}</span>
              </li>
            ))}
          </ul>
        </div>
        {graph.phases.length > 0 && <PhaseSteps phases={graph.phases} />}
      </section>

      {total === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          Ingen issues har labelen <code>epic:{epic}</code> ennå.
        </p>
      ) : (
        <section
          className="max-h-[78vh] min-h-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm"
          style={{ aspectRatio: `${layout.width + 160} / ${layout.height + 160}` }}
          aria-label="Avhengighetsgraf"
        >
          <ClientTicketGraph nodes={nodes} edges={edges} />
        </section>
      )}

      {total > 0 && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
            Alle tickets
          </h2>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Issue</th>
                <th className="px-4 py-2 font-medium">Fase</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Blokkeres av</th>
                <th className="px-4 py-2 font-medium">Lukket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {own.map((ticket) => {
                const blockers = graph.dependencies
                  .filter((it) => it.blocked === ticket.id)
                  .map((it) => graph.tickets.find((t) => t.id === it.blocker)!);
                return (
                  <tr key={ticket.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <a
                        href={ticket.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-900 hover:text-blue-700 hover:underline"
                      >
                        <span className="mr-2 font-mono text-xs text-slate-400">#{ticket.number}</span>
                        <IssueTitle title={ticket.title} />
                      </a>
                    </td>
                    <td className="px-4 py-2 text-slate-500">{ticket.fase ?? "–"}</td>
                    <td className="px-4 py-2">
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      {blockers.length === 0
                        ? "–"
                        : blockers.map((it, index) => (
                            <span key={it.id}>
                              {index > 0 && ", "}
                              <a
                                href={it.url}
                                target="_blank"
                                rel="noreferrer"
                                className={`font-mono text-xs hover:underline ${it.status === "ferdig" ? "text-slate-400 line-through" : "text-slate-700"}`}
                              >
                                #{it.number}
                              </a>
                            </span>
                          ))}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-slate-500">
                      {ticket.closedAt ? formatDate(ticket.closedAt) : "–"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
