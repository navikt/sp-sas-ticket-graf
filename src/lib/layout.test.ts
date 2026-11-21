import { describe, expect, it } from "vitest";
import { layoutGraph, TICKET_HEIGHT, TICKET_WIDTH, type GraphLayout } from "./layout";
import type { Phase } from "./phases";
import { countStatuses, type Dependency, type EpicGraph, type Ticket } from "./tickets";

function ticket(number: number, fase: string): Ticket {
  return {
    id: `navikt/sas-issues#${number}`,
    number,
    title: `Ticket ${number}`,
    url: `https://github.com/navikt/sas-issues/issues/${number}`,
    status: "klar",
    closedAt: null,
    fase,
    repos: [],
    assignees: [],
    external: false,
    epic: "eksempel",
  };
}

function phase(key: string, tickets: Ticket[]): Phase {
  return {
    key,
    name: null,
    description: null,
    inferred: false,
    ticketIds: tickets.filter((it) => it.fase === key).map((it) => it.id),
    gate: null,
    done: 0,
    total: 0,
    status: "ikke startet",
    finishedAt: null,
  };
}

function dependency(blocker: Ticket, blocked: Ticket): Dependency {
  return { id: `${blocker.id}->${blocked.id}`, blocker: blocker.id, blocked: blocked.id };
}

function graphOf(tickets: Ticket[], dependencies: Dependency[]): EpicGraph {
  const keys = [...new Set(tickets.map((it) => it.fase!))];
  return {
    epic: "eksempel",
    spec: null,
    tickets,
    dependencies,
    phases: keys.map((it) => phase(it, tickets)),
    counts: countStatuses(tickets.map((it) => it.status)),
  };
}

function absolutePositions(layout: GraphLayout): Map<string, { x: number; y: number }> {
  const fases = new Map(layout.fases.map((it) => [it.id, it]));
  return new Map(
    layout.tickets.map(({ ticket, x, y, parent }) => {
      const offset = parent ? fases.get(parent)! : { x: 0, y: 0 };
      return [ticket.id, { x: x + offset.x, y: y + offset.y }];
    }),
  );
}

function overlaps(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  return Math.abs(a.x - b.x) < TICKET_WIDTH && Math.abs(a.y - b.y) < TICKET_HEIGHT;
}

describe("layoutGraph", () => {
  const forrige = [1, 2].map((it) => ticket(it, "1"));
  const uavhengige = [10, 11, 12, 13, 14, 15, 16].map((it) => ticket(it, "2"));
  const koblet = [20, 21].map((it) => ticket(it, "2"));
  const neste = ticket(30, "3");
  const tickets = [...forrige, ...uavhengige, ...koblet, neste];
  const dependencies = [
    dependency(forrige[0], koblet[0]),
    dependency(forrige[1], koblet[1]),
    dependency(koblet[1], neste),
  ];

  it("fordeler uavhengige tickets i en fase over flere kolonner", async () => {
    const layout = await layoutGraph(graphOf(tickets, dependencies));
    const fase = layout.fases.find((it) => it.fase === "2")!;
    const columns = Map.groupBy(
      layout.tickets.filter((it) => it.parent === fase.id),
      (it) => Math.round(it.x),
    );

    expect(columns.size).toBe(3);
    expect(Math.max(...[...columns.values()].map((it) => it.length))).toBeLessThanOrEqual(5);
  });

  it("lar ingen tickets overlappe og holder avhengigheter fra venstre mot høyre", async () => {
    const layout = await layoutGraph(graphOf(tickets, dependencies));
    const positions = absolutePositions(layout);
    const all = [...positions.values()];

    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) expect(overlaps(all[i], all[j])).toBe(false);
    }
    for (const it of dependencies) {
      expect(positions.get(it.blocker)!.x).toBeLessThan(positions.get(it.blocked)!.x);
    }
  });

  it("lar ingen faser overlappe", async () => {
    const { fases } = await layoutGraph(graphOf(tickets, dependencies));
    for (let i = 0; i < fases.length; i++) {
      for (let j = i + 1; j < fases.length; j++) {
        const [a, b] = [fases[i], fases[j]];
        const separate = a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
        expect(separate).toBe(true);
      }
    }
  });

  it("legger én uavhengig ticket alene uten ekstra kolonner", async () => {
    const enslig = [ticket(1, "1")];
    const layout = await layoutGraph(graphOf(enslig, []));
    expect(layout.fases[0].width).toBeLessThan(2 * TICKET_WIDTH);
  });
});
