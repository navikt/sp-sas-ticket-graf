# sp-sas-ticket-graf

Viser avhengighetene mellom ticketene i en epic i [`navikt/sas-issues`](https://github.com/navikt/sas-issues/issues) som en graf. Appen henter issuene fra GitHub på serveren og mellomlagrer svarene i minnet i hver pod i 10 minutter. Knappen «Hent på nytt» nede til høyre tømmer mellomlageret og henter alt på nytt. Hver ticket er farget etter status og lenker til issuet på GitHub.

## Kjøre lokalt

Appen trenger et GitHub-token med lesetilgang til `navikt/sas-issues`. Tokenet fra `gh` holder:

```sh
pnpm install
echo "GITHUB_TOKEN=$(gh auth token)" > .env.local
pnpm dev
```

Åpne <http://localhost:3000>.

Uten token kan du kjøre mot faste testdata i `fixtures/`:

```sh
pnpm dev:mock
```

## Slik leser appen issuene

- **Epic:** hver label som begynner med `epic:` blir en epic. Slugen etter `epic:` er adressen, for eksempel `/avklare-rettighetskategori`.
- **Ferdig epic:** en epic der alle ticketene er lukket. Forsiden legger ferdige epicer i en egen seksjon som er lukket til du åpner den.
- **Spec:** issuet med labelen `spec-issue` i epicen er specen. Det tegnes ikke som en ticket, men tittelen blir overskriften og lenker til issuet.
- **Avhengigheter:** GitHubs innebygde «blocked by». En pil går fra blokkereren til ticketen den blokkerer.
- **Fase:** linjen `**Fase:** <n>` i issue-teksten. Tickets i samme fase tegnes i en egen boks. Boksen blir grønn med datoen for siste lukking når hele fasen er ferdig, og stiplet når ingenting i fasen er påbegynt.
- **Utledede faser:** har ingen issues i epicen `**Fase:**`, deler appen epicen ved utrullingene. En utrulling er en ticket med tittel som «Rulle ut …», «Skru på …», «… i prod», «Fjerne togglen …» eller «Lansere …». Hver ticket havner i fasen til den første utrullingen den leder fram til. Ticketer som kommer etter siste utrulling, samles i fasen «Etter utrulling».
- **Avslutter fasen:** utrullingen, eller den eneste ticketen i fasen som ingen andre i fasen venter på, merkes med et flagg.
- **Repoer:** linjen `**Repo:**` i issue-teksten. Repoene vises som merkelapper på ticketen.
- **Blokkeringer fra andre epicer** tegnes med stiplet kant og lenker til grafen for sin epic.

| Status   | Regel                                         |
| -------- | --------------------------------------------- |
| Ferdig   | Issuet er lukket                              |
| Pågår    | Åpent og tildelt noen                         |
| Blokkert | Åpent, ikke tildelt og har åpne blokkeringer  |
| Klar     | Åpent, ikke tildelt og uten åpne blokkeringer |

Konvensjonene for issuene står i [`docs/agents/issue-tracker.md`](https://github.com/navikt/helse-sas-meta/blob/main/docs/agents/issue-tracker.md) i sas-meta.

## Drift

Appen kjører bare i prod-gcp, i namespacet `tbd`, på <https://sas-epics.ansatt.nav.no>. Appen har ingen egen innlogging. Den er bare tilgjengelig gjennom ansatt-ingressen, som bare kan nås fra Navs nett.

`deploy.yml` tester, bygger imaget og deployer `deploy/prod.yml` ved push til `main`. Den kjører også hver onsdag, slik at imaget får nye sikkerhetsoppdateringer. Pull requests bygges og testes i `pull-requests.yml`. Dependabot oppdaterer avhengighetene, og `standard-dependabot-auto-merge.yml` merger alt unntatt major-oppdateringer av npm-pakker.

GitHub gir tokenet 5 000 GraphQL-poeng i timen, og kvoten deles med alle andre tokens til samme bruker. Forsiden henter bare det den trenger for å telle statusene, og grafen henter høyst 20 blokkeringer per ticket (`MAX_BLOCKERS` i `src/lib/github.ts`). Har en ticket flere, logger appen en advarsel.

Appen leser `GITHUB_TOKEN` fra Nais-secreten `sp-sas-ticket-graf`. Tokenet trenger bare lesetilgang til issuene i `navikt/sas-issues`. Opprett secreten for teamet `tbd` i prod-gcp i [Nais Console](https://console.nav.cloud.nais.io) før første deploy.

### Fornye tokenet

Tokenet utløper etter 90 dager og må fornyes før det. Neste fornyelse: **3. februar 2027**.

1. Lag et nytt fine-grained token på GitHub under Settings → Developer settings → Fine-grained tokens:
   - Resource owner: `navikt`
   - Repository access: bare `navikt/sas-issues`
   - Permissions: Issues: Read-only
   - Expiration: 90 dager
2. Vent til navikt har godkjent tokenet, hvis det kreves.
3. Oppdater `GITHUB_TOKEN` i secreten `sp-sas-ticket-graf` for teamet `tbd` i prod-gcp i [Nais Console](https://console.nav.cloud.nais.io).
4. Start podden på nytt slik at den leser det nye tokenet.
5. Oppdater datoen for neste fornyelse i denne README-en.

## Tester

```sh
pnpm test       # Vitest: statusregler, parsing, grafbygging og layout
pnpm test:e2e   # Playwright mot testdataene, bygger og starter appen selv
pnpm tsc && pnpm lint
```

Første gang må du kanskje installere nettleseren med `pnpm exec playwright install chromium`.

## Testdata

`fixtures/` inneholder svar fra GitHubs GraphQL-API. `epic-eksempel.json` er oppdiktet og dekker alle statusene, en ticket uten fase og blokkeringer fra andre epicer. De andre er øyeblikksbilder av ekte epicer.

`e2e/screenshots.mjs` tar skjermbilder av alle sidene mot en kjørende server på port 3100. Bruk det når du justerer utseendet.

## Teknikk

Next.js (App Router) med Tailwind, [React Flow](https://reactflow.dev/) for grafen og [elkjs](https://github.com/kieler/elkjs) for plasseringen av nodene. Kallene mot GitHub ligger i `src/lib/github.ts`, og reglene for status og graf i `src/lib/tickets.ts`.
