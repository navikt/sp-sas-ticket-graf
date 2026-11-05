import { describe, expect, it } from "vitest";
import { fetchEpicIssues, fetchEpics, type Transport } from "./github";
import { layoutGraph, TICKET_HEIGHT, TICKET_WIDTH } from "./layout";
import { buildEpicGraph, deriveStatus, parseFase, parseRepos, type Issue } from "./tickets";
import epics from "../../fixtures/epics.json";
import eksempel from "../../fixtures/epic-eksempel.json";

const fixtureTransport: Transport = async <T>(query: string) =>
  (query.includes("query Epics") ? epics : eksempel) as T;

async function eksempelGraph() {
  return buildEpicGraph("eksempel", await fetchEpicIssues(fixtureTransport, "eksempel"));
}

describe("deriveStatus", () => {
  const open = { state: "OPEN" as const, assignees: [], openBlockerCount: 0 };
  const someone = [{ login: "kari", avatarUrl: null }];

  it("er ferdig når issuet er lukket, uansett blokkeringer", () => {
    expect(deriveStatus({ ...open, state: "CLOSED", openBlockerCount: 2 })).toBe("ferdig");
  });

  it("er pågår når issuet er tildelt, også om det har åpne blokkeringer", () => {
    expect(deriveStatus({ ...open, assignees: someone, openBlockerCount: 1 })).toBe("pågår");
  });

  it("er blokkert når issuet har åpne blokkeringer og ingen er tildelt", () => {
    expect(deriveStatus({ ...open, openBlockerCount: 1 })).toBe("blokkert");
  });

  it("er klar når issuet er åpent, ikke tildelt og uten åpne blokkeringer", () => {
    expect(deriveStatus(open)).toBe("klar");
  });
});

describe("parsing av issue-teksten", () => {
  const body = "**Spec:** [x](y)\n\n**Fase:** 2\n\n**Repo:** `spleis`, `sp-rettighetskategori` (nytt)\n";

  it("leser fasen", () => {
    expect(parseFase(body)).toBe("2");
    expect(parseFase("Ingen fase her")).toBeNull();
  });

  it("leser repoene i kodeformat fra Repo-linjen", () => {
    expect(parseRepos(body)).toEqual(["spleis", "sp-rettighetskategori"]);
    expect(parseRepos("**Hva skal lages:** `ikke-et-repo`")).toEqual([]);
  });
});

describe("fetchEpics", () => {
  it("lister epicene fra labelene sortert på navn", async () => {
    const result = await fetchEpics(fixtureTransport);
    expect(result.map((it) => it.slug)).toEqual([
      "avklare-rettighetskategori",
      "eksempel",
      "graderte-andre-ytelser",
    ]);
  });
});

describe("buildEpicGraph", () => {
  it("utleder status for hver ticket i epicen", async () => {
    const graph = await eksempelGraph();
    const status = Object.fromEntries(graph.tickets.map((it) => [it.number, it.status]));
    expect(status).toMatchObject({
      901: "ferdig",
      902: "ferdig",
      903: "pågår",
      904: "klar",
      905: "blokkert",
      906: "blokkert",
      907: "klar",
    });
    expect(graph.counts).toEqual({ ferdig: 2, pågår: 1, klar: 2, blokkert: 2 });
  });

  it("tar med blokkeringer fra andre epicer som eksterne tickets", async () => {
    const graph = await eksempelGraph();
    const external = graph.tickets.filter((it) => it.external);
    expect(external.map((it) => [it.number, it.epic, it.status])).toEqual([
      [22, "avklare-rettighetskategori", "ferdig"],
      [38, "graderte-andre-ytelser", "blokkert"],
    ]);
  });

  it("lager én avhengighet per blokkering, fra blokkeringen til ticketen den blokkerer", async () => {
    const graph = await eksempelGraph();
    expect(graph.dependencies).toHaveLength(9);
    expect(graph.dependencies).toContainEqual({
      id: "navikt/sas-issues#38->navikt/sas-issues#906",
      blocker: "navikt/sas-issues#38",
      blocked: "navikt/sas-issues#906",
    });
  });

  it("tegner ikke spec-issuet som en ticket, men husker det som specen for epicen", async () => {
    const graph = await eksempelGraph();

    expect(graph.spec).toEqual({
      number: 900,
      title: "Eksempel på en epic med alle statuser",
      url: "https://github.com/navikt/sas-issues/issues/900",
    });
    expect(graph.tickets.map((it) => it.number)).not.toContain(900);
    expect(graph.counts.klar + graph.counts.blokkert + graph.counts.pågår + graph.counts.ferdig).toBe(7);
  });

  it("teller ikke en ekstern ticket to ganger når den blokkerer flere", () => {
    const blocker = {
      repository: "navikt/sas-issues",
      number: 1,
      title: "Ekstern",
      url: "u",
      state: "OPEN" as const,
      closedAt: null,
      assignees: [],
      labels: ["epic:annen"],
      openBlockerCount: 0,
    };
    const issue = (number: number): Issue => ({
      ...blocker,
      number,
      labels: ["epic:x"],
      body: "",
      blockedBy: [blocker],
    });
    const graph = buildEpicGraph("x", [issue(2), issue(3)]);
    expect(graph.tickets.filter((it) => it.external)).toHaveLength(1);
    expect(graph.dependencies).toHaveLength(2);
  });
});

describe("layoutGraph", () => {
  it("legger ticketene i fasebokser og ticketer uten fase utenfor", async () => {
    const layout = await layoutGraph(await eksempelGraph());
    expect(layout.fases.map((it) => it.fase)).toEqual(["1", "2", "3"]);

    const parentOf = Object.fromEntries(layout.tickets.map((it) => [it.ticket.number, it.parent]));
    expect(parentOf).toMatchObject({ 901: "fase:1", 904: "fase:2", 906: "fase:3", 907: null, 22: null });
  });

  it("holder ticketene innenfor fasen sin", async () => {
    const layout = await layoutGraph(await eksempelGraph());
    for (const { parent, x, y } of layout.tickets) {
      if (!parent) continue;
      const fase = layout.fases.find((it) => it.id === parent)!;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + TICKET_WIDTH).toBeLessThanOrEqual(fase.width);
      expect(y + TICKET_HEIGHT).toBeLessThanOrEqual(fase.height);
    }
  });

  it("plasserer en blokkering til venstre for ticketen den blokkerer", async () => {
    const layout = await layoutGraph(await eksempelGraph());
    const absoluteX = (number: number) => {
      const positioned = layout.tickets.find((it) => it.ticket.number === number)!;
      const fase = layout.fases.find((it) => it.id === positioned.parent);
      return positioned.x + (fase?.x ?? 0);
    };
    expect(absoluteX(901)).toBeLessThan(absoluteX(902));
    expect(absoluteX(905)).toBeLessThan(absoluteX(906));
  });
});
