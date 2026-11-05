import type { Dependency, Ticket } from "./tickets";

export type PhaseStatus = "ferdig" | "pågår" | "ikke startet";

export interface Phase {
  key: string;
  name: string | null;
  inferred: boolean;
  ticketIds: string[];
  gate: string | null;
  done: number;
  total: number;
  status: PhaseStatus;
  finishedAt: string | null;
}

const ROLLOUT = /\b(rull\w*\s+ut|skru\w*\s+på|i\s+prod\b|fjern\w*\s+togglen|lanser\w*)/i;
const AFTER_LAST_ROLLOUT = "Etter utrulling";

export function isRollout(title: string): boolean {
  return ROLLOUT.test(title);
}

function stripNumberPrefix(title: string): string {
  return title.replace(/^\d+:\s*/, "");
}

function compareKey(a: string, b: string): number {
  return a.localeCompare(b, "nb", { numeric: true });
}

/**
 * Faser kommer fra `**Fase:**` i issuene. Har ingen issues fase, deles epicen ved utrullingene:
 * hver ticket hører til den første utrullingen den leder fram til.
 */
export function derivePhases(tickets: Ticket[], dependencies: Dependency[]): Phase[] {
  const internal = tickets.filter((it) => !it.external);
  const ids = new Set(internal.map((it) => it.id));
  const edges = dependencies.filter((it) => ids.has(it.blocker) && ids.has(it.blocked));
  const blocks = groupBy(edges, (it) => it.blocker, (it) => it.blocked);
  const blockedBy = groupBy(edges, (it) => it.blocked, (it) => it.blocker);

  const membership = internal.some((it) => it.fase)
    ? explicitMembership(internal)
    : inferredMembership(internal, blocks, blockedBy);

  return membership.map(({ key, name, inferred, ticketIds, gate }) => {
    const members = internal.filter((it) => ticketIds.includes(it.id));
    const done = members.filter((it) => it.status === "ferdig");
    const started = members.some((it) => it.status === "ferdig" || it.status === "pågår");
    const finished = done.length === members.length;
    return {
      key,
      name,
      inferred,
      ticketIds,
      gate: gate ?? soleSink(ticketIds, blocks),
      done: done.length,
      total: members.length,
      status: finished ? "ferdig" : started ? "pågår" : "ikke startet",
      finishedAt: finished ? latest(done.map((it) => it.closedAt)) : null,
    };
  });
}

type Membership = Pick<Phase, "key" | "name" | "inferred" | "ticketIds"> & { gate?: string | null };

function explicitMembership(tickets: Ticket[]): Membership[] {
  const keys = [...new Set(tickets.flatMap((it) => (it.fase ? [it.fase] : [])))].sort(compareKey);
  return keys.map((key) => ({
    key,
    name: null,
    inferred: false,
    ticketIds: tickets.filter((it) => it.fase === key).map((it) => it.id),
  }));
}

function inferredMembership(
  tickets: Ticket[],
  blocks: Map<string, string[]>,
  blockedBy: Map<string, string[]>,
): Membership[] {
  const depth = longestPathDepth(tickets, blockedBy);
  const rollouts = tickets
    .filter((it) => isRollout(it.title))
    .sort((a, b) => depth.get(a.id)! - depth.get(b.id)! || a.number - b.number);
  if (rollouts.length === 0) return [];

  const order = new Map(rollouts.map((it, index) => [it.id, index]));
  const afterRollout = reachable(rollouts.map((it) => it.id), blocks);
  const phaseOf = new Map<string, number>();

  for (const ticket of tickets) {
    const ahead = reachable([ticket.id], blocks);
    const first = Math.min(...[...ahead].flatMap((id) => (order.has(id) ? [order.get(id)!] : [])));
    if (Number.isFinite(first)) phaseOf.set(ticket.id, first);
    else if (afterRollout.has(ticket.id)) phaseOf.set(ticket.id, rollouts.length);
  }

  const phases: Membership[] = rollouts.map((rollout, index) => ({
    key: String(index + 1),
    name: stripNumberPrefix(rollout.title),
    inferred: true,
    ticketIds: tickets.filter((it) => phaseOf.get(it.id) === index).map((it) => it.id),
    gate: rollout.id,
  }));
  const trailing = tickets.filter((it) => phaseOf.get(it.id) === rollouts.length).map((it) => it.id);
  if (trailing.length > 0) {
    phases.push({
      key: String(rollouts.length + 1),
      name: AFTER_LAST_ROLLOUT,
      inferred: true,
      ticketIds: trailing,
      gate: null,
    });
  }

  for (const phase of phases) {
    for (const id of phase.ticketIds) tickets.find((it) => it.id === id)!.fase = phase.key;
  }
  return phases;
}

function soleSink(ticketIds: string[], blocks: Map<string, string[]>): string | null {
  if (ticketIds.length < 2) return null;
  const inPhase = new Set(ticketIds);
  const sinks = ticketIds.filter((id) => !(blocks.get(id) ?? []).some((next) => inPhase.has(next)));
  return sinks.length === 1 ? sinks[0] : null;
}

function reachable(start: string[], blocks: Map<string, string[]>): Set<string> {
  const seen = new Set<string>(start);
  const queue = [...start];
  while (queue.length > 0) {
    for (const next of blocks.get(queue.pop()!) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

function longestPathDepth(tickets: Ticket[], blockedBy: Map<string, string[]>): Map<string, number> {
  const depth = new Map<string, number>();
  const visiting = new Set<string>();
  const visit = (id: string): number => {
    if (depth.has(id)) return depth.get(id)!;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const value = Math.max(-1, ...(blockedBy.get(id) ?? []).map(visit)) + 1;
    visiting.delete(id);
    depth.set(id, value);
    return value;
  };
  for (const ticket of tickets) visit(ticket.id);
  return depth;
}

function groupBy<T>(items: T[], key: (it: T) => string, value: (it: T) => string): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const item of items) result.set(key(item), [...(result.get(key(item)) ?? []), value(item)]);
  return result;
}

function latest(dates: (string | null)[]): string | null {
  return dates.filter((it): it is string => it !== null).sort().at(-1) ?? null;
}
