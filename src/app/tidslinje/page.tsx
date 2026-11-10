import Link from "next/link";
import { ErrorPanel } from "@/components/ErrorPanel";
import { loadEpicSummary, loadEpics } from "@/lib/data";
import { epicTitle, formatDate } from "@/lib/format";
import { isEpicDone, type Epic, type Status, STATUSES } from "@/lib/tickets";

export const dynamic = "force-dynamic";

type TimelineEpic = {
  epic: Epic;
  counts: Record<Status, number>;
  deliveredAt: string | null;
};

export default async function TimelinePage() {
  let epics: TimelineEpic[];
  try {
    const listedEpics = await loadEpics();
    epics = await Promise.all(
      listedEpics.map(async (epic) => ({
        epic,
        ...(await loadEpicSummary(epic.slug)),
      })),
    );
  } catch (error) {
    return <ErrorPanel error={error} />;
  }

  const active = epics.filter(({ counts }) => !isEpicDone(counts));
  const delivered = epics
    .filter((item): item is TimelineEpic & { deliveredAt: string } => item.deliveredAt !== null)
    .sort((a, b) => Date.parse(b.deliveredAt) - Date.parse(a.deliveredAt));
  const deliveredByYear = Map.groupBy(delivered, (item) =>
    new Intl.DateTimeFormat("nb-NO", { year: "numeric", timeZone: "Europe/Oslo" }).format(
      new Date(item.deliveredAt),
    ),
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Tidslinje</h1>
      <p className="mt-2 text-slate-600">Se hvilke epicer som pågår, og når de ble levert.</p>

      <section aria-labelledby="paagar" className="mt-8">
        <h2 id="paagar" className="text-lg font-semibold text-slate-900">
          Pågår
        </h2>
        {active.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Ingen epicer pågår.</p>
        ) : (
          <TimelineList epics={active} />
        )}
      </section>

      <section aria-labelledby="leverte" className="mt-10">
        <h2 id="leverte" className="text-lg font-semibold text-slate-900">
          Leverte epicer
        </h2>
        {delivered.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Ingen epicer er levert ennå.</p>
        ) : (
          [...deliveredByYear.entries()].map(([year, yearEpics]) => (
            <section key={year} aria-labelledby={`aar-${year}`} className="mt-6">
              <h3 id={`aar-${year}`} className="mb-3 text-base font-semibold text-slate-700">
                {year}
              </h3>
              <TimelineList epics={yearEpics} />
            </section>
          ))
        )}
      </section>
    </main>
  );
}

function TimelineList({ epics }: { epics: TimelineEpic[] }) {
  return (
    <ol className="ml-2 mt-4 border-l-2 border-slate-300">
      {epics.map(({ epic, counts, deliveredAt }) => {
        const total = STATUSES.reduce((sum, status) => sum + counts[status], 0);
        return (
          <li
            key={epic.slug}
            data-testid="tidslinje-epic"
            className="relative pb-7 pl-6 last:pb-0"
          >
            <span
              aria-hidden="true"
              className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-blue-700 bg-white"
            />
            {deliveredAt ? (
              <time
                data-testid="levert"
                dateTime={deliveredAt}
                className="text-sm font-medium text-slate-600"
              >
                {formatDate(deliveredAt)}
              </time>
            ) : (
              <p className="text-sm text-slate-600">
                {counts.ferdig}/{total} ferdig
              </p>
            )}
            <p className="mt-1 font-semibold">
              <Link href={`/${epic.slug}`} className="text-blue-700 underline hover:text-blue-900">
                {epicTitle(epic.slug)}
              </Link>
            </p>
            {epic.description && <p className="mt-1 text-sm text-slate-600">{epic.description}</p>}
          </li>
        );
      })}
    </ol>
  );
}
