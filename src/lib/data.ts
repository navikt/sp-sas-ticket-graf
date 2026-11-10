import "server-only";

import { fetchEpicCounts, fetchEpicIssues, fetchEpics } from "./github";
import { buildEpicGraph, type Epic, type EpicGraph, type Status } from "./tickets";
import { transport } from "./transport";

export async function loadEpics(): Promise<Epic[]> {
  return fetchEpics(transport());
}

export async function loadEpicGraph(epic: string): Promise<EpicGraph> {
  return buildEpicGraph(epic, await fetchEpicIssues(transport(), epic));
}

export async function loadEpicCounts(epic: string): Promise<Record<Status, number>> {
  return fetchEpicCounts(transport(), epic);
}
