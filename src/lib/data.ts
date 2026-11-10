import "server-only";

import { fetchEpicIssues, fetchEpicSummary, fetchEpics, type EpicSummary } from "./github";
import { buildEpicGraph, type Epic, type EpicGraph } from "./tickets";
import { transport } from "./transport";

export async function loadEpics(): Promise<Epic[]> {
  return fetchEpics(transport());
}

export async function loadEpicGraph(epic: string): Promise<EpicGraph> {
  return buildEpicGraph(epic, await fetchEpicIssues(transport(), epic));
}

export async function loadEpicSummary(epic: string): Promise<EpicSummary> {
  return fetchEpicSummary(transport(), epic);
}
