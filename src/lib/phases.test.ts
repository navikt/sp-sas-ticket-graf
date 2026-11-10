import { describe, expect, it } from "vitest";
import { fetchEpicIssues, type Transport } from "./github";
import { buildEpicGraph, type EpicGraph, type Issue } from "./tickets";
import avklare from "../../fixtures/epic-avklare-rettighetskategori.json";
import graderte from "../../fixtures/epic-graderte-andre-ytelser.json";
import eksempel from "../../fixtures/epic-eksempel.json";

async function graphOf(epic: string, fixture: unknown) {
  const transport: Transport = async <T>() => fixture as T;
  return buildEpicGraph(epic, await fetchEpicIssues(transport, epic));
}

function numbersIn(graph: EpicGraph, key: string) {
  const phase = graph.phases.find((it) => it.key === key)!;
  return phase.ticketIds.map((id) => graph.tickets.find((it) => it.id === id)!.number).sort((a, b) => a - b);
}

function gateOf(graph: EpicGraph, key: string) {
  const gate = graph.phases.find((it) => it.key === key)!.gate;
  return gate ? graph.tickets.find((it) => it.id === gate)!.number : null;
}

describe("faser fra issue-teksten", () => {
  it("bruker fasen fra issuene og finner ticketen som avslutter hver fase", async () => {
    const graph = await graphOf("avklare-rettighetskategori", avklare);

    expect(graph.phases.map((it) => it.key)).toEqual(["1", "2", "3", "4", "5"]);
    expect(graph.phases.every((it) => !it.inferred)).toBe(true);
    expect(numbersIn(graph, "1")).toEqual([17, 18, 19, 20, 22, 29]);
    expect(gateOf(graph, "1")).toBe(22);
    expect(gateOf(graph, "2")).toBe(24);
    expect(gateOf(graph, "3")).toBe(27);
    expect(gateOf(graph, "4")).toBeNull();
  });

  it("er ferdig når alle ticketene er lukket, og husker når den siste ble lukket", async () => {
    const graph = await graphOf("avklare-rettighetskategori", avklare);
    const fase = (key: string) => graph.phases.find((it) => it.key === key)!;

    expect(fase("1")).toMatchObject({ status: "ferdig", done: 6, total: 6 });
    expect(fase("1").finishedAt).toMatch(/^2026-11-04/);
    expect(fase("4")).toMatchObject({ status: "ikke startet", done: 0, total: 1, finishedAt: null });
    expect(fase("5")).toMatchObject({ status: "pågår", done: 1, total: 2, finishedAt: null });
  });

  it("lar ticketer uten fase stå utenfor når andre ticketer har fase", async () => {
    const graph = await graphOf("eksempel", eksempel);

    expect(graph.phases.map((it) => it.key)).toEqual(["1", "2", "3"]);
    expect(graph.tickets.find((it) => it.number === 907)!.fase).toBeNull();
  });
});

describe("utledede faser", () => {
  it("deler epicen ved utrullingene når ingen issues har fase", async () => {
    const graph = await graphOf("graderte-andre-ytelser", graderte);

    expect(graph.phases).toHaveLength(2);
    expect(graph.phases.every((it) => it.inferred)).toBe(true);
    expect(numbersIn(graph, "1")).toEqual([32, 33, 34, 35, 36, 37, 38]);
    expect(gateOf(graph, "1")).toBe(38);
    expect(numbersIn(graph, "2")).toEqual([39, 40, 41, 42, 43, 44, 45, 46, 47, 48]);
    expect(gateOf(graph, "2")).toBe(48);
    expect(graph.phases[0].name).toBe("Fjerne togglen for graderte andre ytelser i Spleis");
  });

  const issue = (number: number, title: string, blockers: number[] = []): Issue => ({
    repository: "navikt/sas-issues",
    number,
    title,
    url: `u${number}`,
    state: "OPEN",
    closedAt: null,
    body: "",
    assignees: [],
    labels: ["epic:x"],
    openBlockerCount: blockers.length,
    blockedBy: blockers.map((it) => ({
      repository: "navikt/sas-issues",
      number: it,
      title: "",
      url: `u${it}`,
      state: "OPEN" as const,
      closedAt: null,
      assignees: [],
      labels: ["epic:x"],
      openBlockerCount: 0,
    })),
  });

  it("samler ticketene etter siste utrulling i en egen fase uten avslutning", () => {
    const graph = buildEpicGraph("x", [
      issue(1, "Bygge"),
      issue(2, "Rulle ut", [1]),
      issue(3, "Rydde opp", [2]),
      issue(4, "Uavhengig"),
    ]);

    expect(graph.phases.map((it) => [it.key, it.name, it.ticketIds.length])).toEqual([
      ["1", "Rulle ut", 2],
      ["2", "Etter utrulling", 1],
    ]);
    expect(graph.phases[1].gate).toBeNull();
    expect(graph.tickets.find((it) => it.number === 4)!.fase).toBeNull();
  });

  it("lager ingen faser når epicen ikke har noen utrulling", () => {
    const graph = buildEpicGraph("x", [issue(1, "Bygge"), issue(2, "Teste", [1])]);

    expect(graph.phases).toEqual([]);
  });
});
