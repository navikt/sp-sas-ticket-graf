import { expect, test } from "@playwright/test";

test("forsiden lister epicene med framdrift", async ({ page }) => {
  await page.goto("/");

  const cards = page.getByTestId("aktive-epicer").getByTestId("epic-card");
  await expect(cards).toHaveCount(3);
  await expect(cards.filter({ hasText: "Avklare rettighetskategori" })).toContainText("12/14");
});

test("forsiden skjuler ferdige epicer til du åpner dem", async ({ page }) => {
  await page.goto("/");

  const ferdige = page.getByTestId("ferdige-epicer");
  const card = ferdige.getByTestId("epic-card");
  await expect(card).toHaveCount(1);
  await expect(card).toBeHidden();

  await ferdige.getByText("Ferdige epicer (1)").click();
  await expect(card).toBeVisible();
  await expect(card).toContainText("Ferdig eksempel");
  await expect(card).toContainText("2/2");
});

test("viser grafen for en epic med status, fase og lenke til issuet", async ({ page }) => {
  await page.goto("/eksempel");

  await expect(page.getByRole("heading", { name: "Eksempel på en epic med alle statuser" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Spec #900" })).toHaveAttribute(
    "href",
    "https://github.com/navikt/sas-issues/issues/900",
  );
  await expect(page.getByTestId("progress-label")).toHaveText("2 av 7 ferdig");
  await expect(page.getByTestId("count-blokkert")).toContainText("2");

  const graph = page.getByRole("region", { name: "Avhengighetsgraf" });
  await expect(graph.getByTestId("ticket")).toHaveCount(9);
  await expect(graph.getByTestId("fase")).toHaveCount(3);

  const ferdig = graph.locator('[data-testid="ticket"][data-number="901"]');
  await expect(ferdig).toHaveAttribute("data-status", "ferdig");
  await expect(ferdig.getByTestId("closed-at")).toHaveText("✓ 2. okt. 2026");
  await expect(ferdig.getByRole("link", { name: "Skjelett for sp-eksempel" })).toHaveAttribute(
    "href",
    "https://github.com/navikt/sas-issues/issues/901",
  );

  const popup = page.waitForEvent("popup");
  await ferdig.getByRole("link", { name: "Skjelett for sp-eksempel" }).click();
  await (await popup).close();

  const statuses = await graph
    .locator('[data-testid="ticket"][data-external="false"]')
    .evaluateAll((nodes) => nodes.map((it) => `${it.dataset.number}:${it.dataset.status}`).sort());
  expect(statuses).toEqual([
    "901:ferdig",
    "902:ferdig",
    "903:pågår",
    "904:klar",
    "905:blokkert",
    "906:blokkert",
    "907:klar",
  ]);

  await expect(graph.locator(".react-flow__edge")).toHaveCount(9);
});

test("viser blokkeringer fra andre epicer og lenker til grafen deres", async ({ page }) => {
  await page.goto("/eksempel");

  const external = page.locator('[data-testid="ticket"][data-external="true"]');
  await expect(external).toHaveCount(2);

  await external.getByRole("link", { name: "↗ avklare-rettighetskategori" }).click();
  await expect(page).toHaveURL(/\/avklare-rettighetskategori$/);
  await expect(page.getByRole("heading", { name: "Avklare rettighetskategori" })).toBeVisible();
});

test("viser fasene, markerer ferdige faser og ticketen som avslutter fasen", async ({ page }) => {
  await page.goto("/avklare-rettighetskategori");

  const steps = page.getByTestId("phase-step");
  await expect(steps).toHaveCount(5);
  await expect(steps.first()).toHaveAttribute("data-status", "ferdig");
  await expect(steps.first()).toContainText("Ferdig 4. nov. 2026");

  const graph = page.getByRole("region", { name: "Avhengighetsgraf" });
  await expect(graph.locator('[data-testid="fase"][data-fase="1"]')).toHaveAttribute("data-status", "ferdig");
  await expect(graph.locator('[data-testid="fase"][data-fase="4"]')).toHaveAttribute("data-status", "ikke startet");
  await expect(graph.locator('[data-testid="ticket"][data-number="22"]')).toHaveAttribute("data-closes-phase", "1");
});

test("utleder faser fra utrullingene når issuene ikke har fase", async ({ page }) => {
  await page.goto("/graderte-andre-ytelser");

  await expect(page.getByText("Utledet fra utrullingene")).toBeVisible();
  const graph = page.getByRole("region", { name: "Avhengighetsgraf" });
  await expect(graph.getByTestId("fase")).toHaveCount(2);
  await expect(graph.locator('[data-testid="ticket"][data-number="38"]')).toHaveAttribute("data-closes-phase", "1");
  await expect(graph.locator('[data-testid="ticket"][data-number="48"]')).toHaveAttribute("data-closes-phase", "2");
});

test("bytter epic med velgeren", async ({ page }) => {
  await page.goto("/avklare-rettighetskategori");

  await page.getByLabel("Velg epic").selectOption("graderte-andre-ytelser");

  await expect(page).toHaveURL(/\/graderte-andre-ytelser$/);
  await expect(page.getByTestId("progress-label")).toHaveText("8 av 17 ferdig");
});

test("viser en egen side for en ukjent epic", async ({ page }) => {
  await page.goto("/finnes-ikke");

  await expect(page.getByRole("heading", { name: "Fant ikke epicen" })).toBeVisible();
});

test("knappen nede til høyre henter dataene på nytt", async ({ page }) => {
  await page.goto("/eksempel");
  await expect(page).toHaveTitle("sas-epics");

  const refresh = page.getByRole("button", { name: "Hent på nytt" });
  await refresh.click();
  await expect(refresh).toBeEnabled();
  await expect(page.getByTestId("progress-label")).toHaveText("2 av 7 ferdig");
});
