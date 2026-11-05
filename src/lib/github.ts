import { EPIC_PREFIX, type Assignee, type Blocker, type Epic, type Issue } from "./tickets";

export const OWNER = "navikt";
export const REPO = "sas-issues";

export type Transport = <T>(query: string, variables: Record<string, unknown>) => Promise<T>;

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
          blockedBy(first: 50) {
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
              blockedBy(first: 50) {
                nodes {
                  state
                }
              }
            }
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
  blockedBy: Nodes<{ state: "OPEN" | "CLOSED" }>;
}

interface IssueNode extends IssueFields {
  body: string;
  blockedBy: Nodes<BlockerNode>;
}

export interface EpicsResponse {
  repository: { labels: Nodes<{ name: string; description: string | null }> };
}

export interface EpicIssuesResponse {
  repository: {
    issues: Nodes<IssueNode> & { pageInfo: { hasNextPage: boolean; endCursor: string | null } };
  };
}

export async function fetchEpics(transport: Transport): Promise<Epic[]> {
  const data = await transport<EpicsResponse>(EPICS_QUERY, { owner: OWNER, name: REPO });
  return data.repository.labels.nodes
    .filter((it) => it.name.startsWith(EPIC_PREFIX))
    .map((it) => ({ slug: it.name.slice(EPIC_PREFIX.length), description: it.description || null }))
    .sort((a, b) => a.slug.localeCompare(b.slug, "nb"));
}

export async function fetchEpicIssues(transport: Transport, epic: string): Promise<Issue[]> {
  const issues: Issue[] = [];
  let cursor: string | null = null;
  do {
    const data: EpicIssuesResponse = await transport<EpicIssuesResponse>(EPIC_ISSUES_QUERY, {
      owner: OWNER,
      name: REPO,
      label: `${EPIC_PREFIX}${epic}`,
      cursor,
    });
    const page = data.repository.issues;
    issues.push(...page.nodes.map(toIssue));
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor);
  return issues;
}

function toIssue(node: IssueNode): Issue {
  return {
    ...toCommonFields(node),
    body: node.body,
    blockedBy: node.blockedBy.nodes.map(toBlocker),
  };
}

function toBlocker(node: BlockerNode): Blocker {
  return {
    ...toCommonFields(node),
    openBlockerCount: node.blockedBy.nodes.filter((it) => it.state === "OPEN").length,
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
