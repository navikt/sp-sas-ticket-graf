import ELK, { type ElkExtendedEdge, type ElkNode } from "elkjs/lib/elk.bundled.js";
import type { EpicGraph, Ticket } from "./tickets";

export const TICKET_WIDTH = 272;
export const TICKET_HEIGHT = 128;

export interface PositionedTicket {
  ticket: Ticket;
  x: number;
  y: number;
  parent: string | null;
}

export interface PositionedFase {
  id: string;
  fase: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GraphLayout {
  fases: PositionedFase[];
  tickets: PositionedTicket[];
  width: number;
  height: number;
}

const elk = new ELK();

export function faseGroupId(fase: string): string {
  return `fase:${fase}`;
}

// ELK legger tickets uten avhengigheter i samme lag, og en fase med mange slike blir en lang kolonne.
// Usynlige kanter mellom dem gir rader i et rutenett. Kantene brukes bare til layouten og tegnes ikke.
function gridEdges(graph: EpicGraph, fase: string): ElkExtendedEdge[] {
  const connected = new Set(graph.dependencies.flatMap((it) => [it.blocker, it.blocked]));
  const isolated = graph.tickets.filter((it) => it.fase === fase && !connected.has(it.id));
  const columns = Math.ceil(Math.sqrt(isolated.length));
  return isolated.flatMap((ticket, index) => {
    const next = isolated[index + 1];
    if (!next || (index + 1) % columns === 0) return [];
    return [{ id: `grid:${ticket.id}->${next.id}`, sources: [ticket.id], targets: [next.id] }];
  });
}

export async function layoutGraph(graph: EpicGraph): Promise<GraphLayout> {
  const fases = graph.phases.map((it) => it.key);
  const ticketNode = (ticket: Ticket): ElkNode => ({
    id: ticket.id,
    width: TICKET_WIDTH,
    height: TICKET_HEIGHT,
  });

  const root: ElkNode = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.layered.spacing.nodeNodeBetweenLayers": "72",
      "elk.spacing.nodeNode": "28",
      "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
    },
    children: [
      ...fases.map(
        (fase): ElkNode => ({
          id: faseGroupId(fase),
          layoutOptions: { "elk.padding": "[top=48,left=24,bottom=24,right=24]" },
          children: graph.tickets.filter((it) => it.fase === fase).map(ticketNode),
        }),
      ),
      ...graph.tickets.filter((it) => !it.fase).map(ticketNode),
    ],
    edges: [
      ...graph.dependencies.map((it) => ({
        id: it.id,
        sources: [it.blocker],
        targets: [it.blocked],
      })),
      ...fases.flatMap((fase) => gridEdges(graph, fase)),
    ],
  };

  const result = await elk.layout(root);
  const byId = new Map(graph.tickets.map((it) => [it.id, it]));
  const positionedFases: PositionedFase[] = [];
  const positionedTickets: PositionedTicket[] = [];

  for (const child of result.children ?? []) {
    const ticket = byId.get(child.id);
    if (ticket) {
      positionedTickets.push({ ticket, x: child.x ?? 0, y: child.y ?? 0, parent: null });
      continue;
    }
    positionedFases.push({
      id: child.id,
      fase: child.id.slice("fase:".length),
      x: child.x ?? 0,
      y: child.y ?? 0,
      width: child.width ?? 0,
      height: child.height ?? 0,
    });
    for (const grandchild of child.children ?? []) {
      positionedTickets.push({
        ticket: byId.get(grandchild.id)!,
        x: grandchild.x ?? 0,
        y: grandchild.y ?? 0,
        parent: child.id,
      });
    }
  }

  return {
    fases: positionedFases,
    tickets: positionedTickets,
    width: result.width ?? 0,
    height: result.height ?? 0,
  };
}
