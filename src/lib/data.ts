import "server-only";

import { fetchEpicIssues, fetchEpics } from "./github";
import { buildEpicGraph, type Epic, type EpicGraph } from "./tickets";
import { transport } from "./transport";

export async function loadEpics(): Promise<Epic[]> {
  return fetchEpics(transport());
}

export async function loadEpicGraph(epic: string): Promise<EpicGraph> {
  return buildEpicGraph(epic, await fetchEpicIssues(transport(), epic));
}
