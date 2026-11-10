import "server-only";

import { TtlCache } from "./cache";
import {
  EPIC_ISSUES_QUERY,
  EPIC_SUMMARY_QUERY,
  EPICS_QUERY,
  type EpicIssuesResponse,
  type EpicSummaryResponse,
  type Transport,
} from "./github";
import epics from "../../fixtures/epics.json";
import avklareRettighetskategori from "../../fixtures/epic-avklare-rettighetskategori.json";
import eksempel from "../../fixtures/epic-eksempel.json";
import ferdigEksempel from "../../fixtures/epic-ferdig-eksempel.json";
import graderteAndreYtelser from "../../fixtures/epic-graderte-andre-ytelser.json";

const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";
const CACHE_TTL_MS = 10 * 60 * 1000;

// Lagt på globalThis så sidene og server-actionen deler samme cache selv om Next laster modulen flere ganger.
const globalForCache = globalThis as typeof globalThis & { gitHubCache?: TtlCache };
const cache = (globalForCache.gitHubCache ??= new TtlCache(CACHE_TTL_MS));

export function clearGitHubCache() {
  cache.clear();
}

const epicFixtures: Record<string, EpicIssuesResponse> = {
  "epic:avklare-rettighetskategori": avklareRettighetskategori as EpicIssuesResponse,
  "epic:eksempel": eksempel as EpicIssuesResponse,
  "epic:ferdig-eksempel": ferdigEksempel as EpicIssuesResponse,
  "epic:graderte-andre-ytelser": graderteAndreYtelser as EpicIssuesResponse,
};

const emptyEpic: EpicIssuesResponse = {
  repository: { issues: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } } },
};

export class MissingTokenError extends Error {
  constructor() {
    super("GITHUB_TOKEN mangler");
  }
}

export function isMock(): boolean {
  return process.env.GITHUB_MOCK === "true";
}

export function transport(): Transport {
  return isMock() ? fixtureTransport : cachedGitHubTransport;
}

const fixtureTransport: Transport = async <T>(query: string, variables: Record<string, unknown>) => {
  if (query === EPICS_QUERY) return epics as T;
  const epic = epicFixtures[String(variables.label)] ?? emptyEpic;
  if (query === EPIC_ISSUES_QUERY) return epic as T;
  if (query === EPIC_SUMMARY_QUERY) return toSummary(epic) as T;
  throw new Error("Ukjent spørring i mock");
};

function toSummary(epic: EpicIssuesResponse): EpicSummaryResponse {
  const { nodes, pageInfo } = epic.repository.issues;
  return {
    repository: {
      issues: {
        pageInfo,
        nodes: nodes.map((it) => ({
          state: it.state,
          assignees: { totalCount: it.assignees.nodes.length },
          labels: it.labels,
          issueDependenciesSummary: it.issueDependenciesSummary,
        })),
      },
    },
  };
}

const gitHubTransport: Transport = async <T>(query: string, variables: Record<string, unknown>) => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new MissingTokenError();

  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`GitHub svarte ${response.status} ${response.statusText}`);
  }
  const json = (await response.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) {
    throw new Error(`GitHub svarte med feil: ${json.errors.map((it) => it.message).join("; ")}`);
  }
  return json.data as T;
};

const cachedGitHubTransport: Transport = <T>(query: string, variables: Record<string, unknown>) =>
  cache.get(JSON.stringify({ query, variables }), () => gitHubTransport<T>(query, variables));
