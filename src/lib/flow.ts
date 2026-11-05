import type { Edge, Node } from "@xyflow/react";
import { formatDate } from "./format";
import type { GraphLayout } from "./layout";
import { TICKET_HEIGHT, TICKET_WIDTH } from "./layout";
import type { Phase } from "./phases";
import type { EpicGraph, Ticket } from "./tickets";

export type TicketNodeData = { ticket: Ticket; closedLabel: string | null; closesPhase: string | null };
export type FaseNodeData = { phase: Phase; finishedLabel: string | null };

export type TicketNode = Node<TicketNodeData, "ticket">;
export type FaseNode = Node<FaseNodeData, "fase">;
export type FlowNode = TicketNode | FaseNode;

export function toFlow(graph: EpicGraph, layout: GraphLayout): { nodes: FlowNode[]; edges: Edge[] } {
  const phaseByKey = new Map(graph.phases.map((it) => [it.key, it]));
  const gates = new Map(graph.phases.flatMap((it) => (it.gate ? [[it.gate, it.key] as const] : [])));

  const fases: FaseNode[] = layout.fases.map((it) => {
    const phase = phaseByKey.get(it.fase)!;
    return {
      id: it.id,
      type: "fase",
      position: { x: it.x, y: it.y },
      data: { phase, finishedLabel: phase.finishedAt ? formatDate(phase.finishedAt) : null },
      style: { width: it.width, height: it.height },
      selectable: false,
      draggable: false,
      zIndex: -1,
    };
  });

  const tickets: TicketNode[] = layout.tickets.map(({ ticket, x, y, parent }) => ({
    id: ticket.id,
    type: "ticket",
    position: { x, y },
    ...(parent ? { parentId: parent, extent: "parent" as const } : {}),
    data: {
      ticket,
      closedLabel: ticket.closedAt ? formatDate(ticket.closedAt) : null,
      closesPhase: gates.get(ticket.id) ?? null,
    },
    width: TICKET_WIDTH,
    height: TICKET_HEIGHT,
    // React Flow slår av pekerhendelser på noder som verken kan dras eller velges, og da kan ingen lenker klikkes.
    style: { pointerEvents: "all" },
  }));

  const statusOf = new Map(graph.tickets.map((it) => [it.id, it.status]));
  const edges: Edge[] = graph.dependencies.map((it) => {
    const open = statusOf.get(it.blocker) !== "ferdig";
    return {
      id: it.id,
      source: it.blocker,
      target: it.blocked,
      type: "smoothstep",
      className: open ? "edge-open" : "edge-done",
      markerEnd: { type: "arrowclosed", width: 16, height: 16, color: open ? "#334155" : "#cbd5e1" },
    };
  });

  return { nodes: [...fases, ...tickets], edges };
}
