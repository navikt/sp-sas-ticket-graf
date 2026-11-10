import { derivePhases, type Phase } from "./phases";

export type Status = "ferdig" | "pågår" | "klar" | "blokkert";

export const STATUSES: readonly Status[] = ["ferdig", "pågår", "klar", "blokkert"];

export const EPIC_PREFIX = "epic:";
export const SPEC_LABEL = "spec-issue";

export interface Assignee {
  login: string;
  avatarUrl: string | null;
}

export interface Issue {
  repository: string;
  number: number;
  title: string;
  url: string;
  state: "OPEN" | "CLOSED";
  closedAt: string | null;
  body: string;
  assignees: Assignee[];
  labels: string[];
  openBlockerCount: number;
  blockedBy: Blocker[];
}

export type Blocker = Omit<Issue, "body" | "blockedBy">;

export interface Epic {
  slug: string;
  description: string | null;
}

export interface Ticket {
  id: string;
  number: number;
  title: string;
  url: string;
  status: Status;
  closedAt: string | null;
  fase: string | null;
  repos: string[];
  assignees: Assignee[];
  external: boolean;
  epic: string | null;
}

export interface Dependency {
  id: string;
  blocker: string;
  blocked: string;
}

export interface Spec {
  number: number;
  title: string;
  url: string;
}

export interface EpicGraph {
  epic: string;
  spec: Spec | null;
  tickets: Ticket[];
  dependencies: Dependency[];
  phases: Phase[];
  counts: Record<Status, number>;
}

export function ticketId(repository: string, number: number): string {
  return `${repository}#${number}`;
}

export function epicOf(labels: string[]): string | null {
  const label = labels.find((it) => it.startsWith(EPIC_PREFIX));
  return label ? label.slice(EPIC_PREFIX.length) : null;
}

export function deriveStatus(issue: {
  state: Issue["state"];
  assigneeCount: number;
  openBlockerCount: number;
}): Status {
  if (issue.state === "CLOSED") return "ferdig";
  if (issue.assigneeCount > 0) return "pågår";
  if (issue.openBlockerCount > 0) return "blokkert";
  return "klar";
}

export function countStatuses(statuses: Status[]): Record<Status, number> {
  const counts = Object.fromEntries(STATUSES.map((it) => [it, 0])) as Record<Status, number>;
  for (const status of statuses) counts[status]++;
  return counts;
}

export function parseFase(body: string): string | null {
  return body.match(/^\*\*Fase:\*\*\s*(.+?)\s*$/m)?.[1] ?? null;
}

export function parseRepos(body: string): string[] {
  const line = body.match(/^\*\*Repo:\*\*(.*)$/m)?.[1];
  if (!line) return [];
  return [...line.matchAll(/`([^`]+)`/g)].map((it) => it[1]);
}

export function buildEpicGraph(epic: string, epicIssues: Issue[]): EpicGraph {
  const specIssue = epicIssues.find((it) => it.labels.includes(SPEC_LABEL));
  const spec = specIssue ? { number: specIssue.number, title: specIssue.title, url: specIssue.url } : null;
  const issues = epicIssues.filter((it) => !it.labels.includes(SPEC_LABEL));
  const tickets = new Map<string, Ticket>();

  for (const issue of issues) {
    const id = ticketId(issue.repository, issue.number);
    tickets.set(id, {
      id,
      number: issue.number,
      title: issue.title,
      url: issue.url,
      status: deriveStatus({ ...issue, assigneeCount: issue.assignees.length }),
      closedAt: issue.closedAt,
      fase: parseFase(issue.body),
      repos: parseRepos(issue.body),
      assignees: issue.assignees,
      external: false,
      epic,
    });
  }

  const dependencies: Dependency[] = [];
  for (const issue of issues) {
    const blocked = ticketId(issue.repository, issue.number);
    for (const blocker of issue.blockedBy) {
      const id = ticketId(blocker.repository, blocker.number);
      if (!tickets.has(id)) {
        tickets.set(id, {
          id,
          number: blocker.number,
          title: blocker.title,
          url: blocker.url,
          status: deriveStatus({ ...blocker, assigneeCount: blocker.assignees.length }),
          closedAt: blocker.closedAt,
          fase: null,
          repos: [],
          assignees: blocker.assignees,
          external: true,
          epic: epicOf(blocker.labels),
        });
      }
      dependencies.push({ id: `${id}->${blocked}`, blocker: id, blocked });
    }
  }

  const sorted = [...tickets.values()].sort(
    (a, b) => Number(a.external) - Number(b.external) || a.number - b.number,
  );
  const counts = countStatuses(sorted.filter((it) => !it.external).map((it) => it.status));

  const phases = derivePhases(sorted, dependencies);
  return { epic, spec, tickets: sorted, dependencies, phases, counts };
}
