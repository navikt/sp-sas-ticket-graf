import {
  countStatuses,
  deriveStatus,
  EPIC_PREFIX,
  isEpicDone,
  SPEC_LABEL,
  type Assignee,
  type Blocker,
  type Epic,
  type Issue,
  type Status,
} from "./tickets";

export const OWNER = "navikt";
export const REPO = "sas-issues";

export type Transport = <T>(query: string, variables: Record<string, unknown>) => Promise<T>;

// GitHub regner kostnaden ut fra hvor mange noder spørringen kan returnere, ikke hvor mange som finnes.
// Hver blokkerer koster to delforespørsler, så denne grensen styrer nesten hele kostnaden.
export const MAX_BLOCKERS = 20;

export const EPICS_QUERY = /* GraphQL */ `
  query Epics($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      labels(first: 100, query: "epic:") {
        nodes {
          name
          description
        }
      }
    }
  }
`;

export const EPIC_ISSUES_QUERY = /* GraphQL */ `
  query EpicIssues($owner: String!, $name: String!, $label: String!, $cursor: String) {
    repository(owner: $owner, name: $name) {
      issues(first: 100, after: $cursor, labels: [$label], states: [OPEN, CLOSED]) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          number
          title
          url
          state
          closedAt
          body
          repository {
            nameWithOwner
          }
          assignees(first: 10) {
            nodes {
              login
              avatarUrl
            }
          }
          labels(first: 20) {
            nodes {
              name
            }
          }
          issueDependenciesSummary {
            blockedBy
            totalBlockedBy
          }
          blockedBy(first: ${MAX_BLOCKERS}) {
            nodes {
              number
              title
              url
              state
              closedAt
              repository {
                nameWithOwner
              }
              assignees(first: 10) {
                nodes {
                  login
                  avatarUrl
                }
              }
              labels(first: 20) {
                nodes {
                  name
                }
              }
              issueDependenciesSummary {
                blockedBy
              }
            }
          }
        }
      }
    }
  }
`;

export const EPIC_SUMMARY_QUERY = /* GraphQL */ `
  query EpicSummary($owner: String!, $name: String!, $label: String!, $cursor: String) {
    repository(owner: $owner, name: $name) {
      issues(first: 100, after: $cursor, labels: [$label], states: [OPEN, CLOSED]) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          state
          closedAt
          assignees {
            totalCount
          }
          labels(first: 20) {
            nodes {
              name
            }
          }
          issueDependenciesSummary {
            blockedBy
          }
        }
      }
    }
  }
`;

interface Nodes<T> {
  nodes: T[];
}

interface IssueFields {
  number: number;
  title: string;
  url: string;
  state: "OPEN" | "CLOSED";
  closedAt: string | null;
  repository: { nameWithOwner: string };
  assignees: Nodes<{ login: string; avatarUrl: string | null }>;
  labels: Nodes<{ name: string }>;
}

interface BlockerNode extends IssueFields {
  issueDependenciesSummary: { blockedBy: number };
}

interface IssueNode extends IssueFields {
  body: string;
  issueDependenciesSummary: { blockedBy: number; totalBlockedBy: number };
  blockedBy: Nodes<BlockerNode>;
}

interface SummaryNode {
  state: "OPEN" | "CLOSED";
  closedAt: string | null;
  assignees: { totalCount: number };
  labels: Nodes<{ name: string }>;
  issueDependenciesSummary: { blockedBy: number };
}

interface Page<T> {
  repository: {
    issues: Nodes<T> & { pageInfo: { hasNextPage: boolean; endCursor: string | null } };
  };
}

export interface EpicsResponse {
  repository: { labels: Nodes<{ name: string; description: string | null }> };
}

export type EpicIssuesResponse = Page<IssueNode>;
export type EpicSummaryResponse = Page<SummaryNode>;

export interface EpicSummary {
  counts: Record<Status, number>;
  deliveredAt: string | null;
}

export async function fetchEpics(transport: Transport): Promise<Epic[]> {
  const data = await transport<EpicsResponse>(EPICS_QUERY, { owner: OWNER, name: REPO });
  return data.repository.labels.nodes
    .filter((it) => it.name.startsWith(EPIC_PREFIX))
    .map((it) => ({ slug: it.name.slice(EPIC_PREFIX.length), description: it.description || null }))
    .sort((a, b) => a.slug.localeCompare(b.slug, "nb"));
}

export async function fetchEpicIssues(transport: Transport, epic: string): Promise<Issue[]> {
  const nodes = await fetchAllPages<IssueNode>(transport, EPIC_ISSUES_QUERY, epic);
  return nodes.map(toIssue);
}

export async function fetchEpicSummary(transport: Transport, epic: string): Promise<EpicSummary> {
  const nodes = await fetchAllPages<SummaryNode>(transport, EPIC_SUMMARY_QUERY, epic);
  const issues = nodes.filter((it) => !it.labels.nodes.some((label) => label.name === SPEC_LABEL));
  const counts = countStatuses(
    issues.map((it) =>
      deriveStatus({
        state: it.state,
        assigneeCount: it.assignees.totalCount,
        openBlockerCount: it.issueDependenciesSummary.blockedBy,
      }),
    ),
  );
  const deliveredAt = isEpicDone(counts)
    ? issues
        .map((it) => it.closedAt)
        .filter((it): it is string => it !== null)
        .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null
    : null;

  return { counts, deliveredAt };
}

async function fetchAllPages<T>(transport: Transport, query: string, epic: string): Promise<T[]> {
  const nodes: T[] = [];
  let cursor: string | null = null;
  do {
    const data: Page<T> = await transport<Page<T>>(query, {
      owner: OWNER,
      name: REPO,
      label: `${EPIC_PREFIX}${epic}`,
      cursor,
    });
    const page = data.repository.issues;
    nodes.push(...page.nodes);
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor);
  return nodes;
}

function toIssue(node: IssueNode): Issue {
  if (node.issueDependenciesSummary.totalBlockedBy > node.blockedBy.nodes.length) {
    console.warn(
      `${node.repository.nameWithOwner}#${node.number} har ${node.issueDependenciesSummary.totalBlockedBy} blokkeringer, men grafen viser bare ${MAX_BLOCKERS}`,
    );
  }
  return {
    ...toCommonFields(node),
    body: node.body,
    openBlockerCount: node.issueDependenciesSummary.blockedBy,
    blockedBy: node.blockedBy.nodes.map(toBlocker),
  };
}

function toBlocker(node: BlockerNode): Blocker {
  return {
    ...toCommonFields(node),
    openBlockerCount: node.issueDependenciesSummary.blockedBy,
  };
}

function toCommonFields(node: IssueFields) {
  return {
    repository: node.repository.nameWithOwner,
    number: node.number,
    title: node.title,
    url: node.url,
    state: node.state,
    closedAt: node.closedAt,
    assignees: node.assignees.nodes.map(
      (it): Assignee => ({ login: it.login, avatarUrl: it.avatarUrl || null }),
    ),
    labels: node.labels.nodes.map((it) => it.name),
  };
}
