import fs from "node:fs";
import path from "node:path";

import {
  getVacationOptimizerSuggestions,
} from "../src/domain/vacation-optimizer.js";
import {
  nodeHolidayRepository,
} from "./lib/node-data-repository.mjs";

const YEARS = [2026, 2027, 2028, 2029, 2030];
const DEFAULT_STATE_CODE = "BY";
const outputDir = path.resolve("public");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatDate(dateKey) {
  const [year, month, day] = String(dateKey).split("-");
  return `${day}.${month}.${year}`;
}

function formatWeekdayDate(dateKey, includeYear = true) {
  const [year, month, day] = String(dateKey).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));

  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(includeYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(date);
}

function formatWeekdayRange(startDate, endDate) {
  const sameYear =
    String(startDate).slice(0, 4) === String(endDate).slice(0, 4);

  return `${formatWeekdayDate(
    startDate,
    !sameYear,
  )} – ${formatWeekdayDate(endDate)}`;
}

function vacationDayLabel(count) {
  return count === 1 ? "Urlaubstag" : "Urlaubstage";
}

function vacationDayDativeLabel(count) {
  return count === 1 ? "Urlaubstag" : "Urlaubstagen";
}

function formatDatasetDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value))
    ? formatDate(value)
    : String(value || "nicht angegeben");
}

function stateSlug(name) {
  return String(name)
    .toLowerCase()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getStateData(publicHolidayIndex, year) {
  return (publicHolidayIndex.datasets || [])
    .filter((meta) => Number(meta.year) === year)
    .map((meta) => {
      const dataset =
        nodeHolidayRepository.loadPublicHolidayDatasetByMeta(meta);

      if (!dataset) {
        throw new Error(
          `Public holiday dataset missing: ${meta.bundeslandCode} ${year}`,
        );
      }

      const holidays =
        dataset.holidays ||
        dataset.events ||
        [];

      const bestSuggestion =
        getVacationOptimizerSuggestions(
          holidays,
          year,
          4,
          {
            limit: 1,
          },
        )[0] || null;

      return {
        code: meta.bundeslandCode,
        name: meta.bundeslandName,
        slug: stateSlug(meta.bundeslandName),
        holidays,
        bestSuggestion,
      };
    })
    .sort((a, b) => {
      return a.name.localeCompare(
        b.name,
        "de-DE",
      );
    });
}

function budgetExamplesHtml(defaultState, year) {
  return [1, 2, 3, 4, 5]
    .map((budget) => {
      const suggestion =
        getVacationOptimizerSuggestions(
          defaultState.holidays,
          year,
          budget,
          {
            limit: 1,
          },
        )[0] || null;

      if (!suggestion) {
        return `          <article class="planner-budget-card" data-budget="${budget}">
            <p class="planner-card-label">Bis zu ${budget} ${vacationDayLabel(budget)}</p>
            <h3>Keine Kombination gefunden</h3>
            <p>Für diese Beispielrechnung liegt aktuell keine passende Kombination vor.</p>
          </article>`;
      }

      return `          <article class="planner-budget-card" data-budget="${budget}">
            <p class="planner-card-label">Bis zu ${budget} ${vacationDayLabel(budget)}</p>
            <h3>${suggestion.freeDays} Tage am Stück frei</h3>
            <p class="planner-period">${formatWeekdayRange(
              suggestion.startDate,
              suggestion.endDate,
            )}</p>
            <p>
              Dafür werden ${suggestion.vacationDays}
              ${vacationDayLabel(suggestion.vacationDays)} benötigt.
            </p>
            <a href="/?state=${defaultState.code}&year=${year}&vacationDays=${budget}#brueckentage">
              Diese Planung im Rechner öffnen
            </a>
          </article>`;
    })
    .join("\n");
}

function stateCardsHtml(states, year) {
  return states
    .map((state) => {
      const suggestion = state.bestSuggestion;

      const resultHtml = suggestion
        ? `<strong>${suggestion.freeDays} Tage am Stück frei</strong>
              <span>
                mit ${suggestion.vacationDays}
                ${vacationDayDativeLabel(suggestion.vacationDays)}
                · ${formatWeekdayRange(
                  suggestion.startDate,
                  suggestion.endDate,
                )}
              </span>`
        : `<strong>Noch keine Empfehlung</strong>
              <span>Für diese Auswahl liegt aktuell kein Ergebnis vor.</span>`;

      return `          <article class="planner-state-card">
            <div>
              <span class="planner-state-code">${escapeHtml(state.code)}</span>
              <h3>${escapeHtml(state.name)}</h3>
            </div>
            <p>
              ${resultHtml}
            </p>
            <div class="planner-state-links">
              <a href="/?state=${escapeHtml(state.code)}&year=${year}&vacationDays=4#brueckentage">
                Urlaubsplaner öffnen
              </a>
              <a href="/schulferien-${escapeHtml(state.slug)}-${year}.html">
                Schulferien ${year}
              </a>
            </div>
          </article>`;
    })
    .join("\n");
}

function structuredDataHtml(year) {
  const faqItems = [
    {
      question: `Wie funktioniert der Urlaubsplaner ${year}?`,
      answer:
        "Der Urlaubsplaner verbindet Wochenenden und landesweit geltende gesetzliche Feiertage mit ausgewählten Urlaubstagen und sucht nach langen zusammenhängenden freien Zeiträumen.",
    },
    {
      question: "Werden Schulferien als freie Arbeitstage gerechnet?",
      answer:
        "Nein. Schulferien dienen auf Schulferienklar der Familien- und Reiseplanung, werden im Urlaubstage-Rechner aber nicht automatisch als arbeitsfreie Tage behandelt.",
    },
    {
      question: "Warum unterscheiden sich die Ergebnisse nach Bundesland?",
      answer:
        "Einige gesetzliche Feiertage gelten nur in bestimmten Bundesländern. Deshalb können sich freie Zeiträume und Brückentage regional unterscheiden.",
    },
    {
      question: "Werden lokale Feiertage und persönliche Arbeitszeiten berücksichtigt?",
      answer:
        "Nein. Der Rechner berücksichtigt Wochenenden und landesweit geltende Feiertage. Lokale Feiertage, Schichtpläne, Betriebsferien und individuelle Arbeitszeitmodelle müssen zusätzlich geprüft werden.",
    },
  ];

  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Schulferienklar",
            item: "https://www.schulferienklar.de/",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: `Urlaubsplaner ${year}`,
            item:
              `https://www.schulferienklar.de/urlaubsplaner-${year}.html`,
          },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: faqItems.map((item) => {
          return {
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          };
        }),
      },
    ],
  };

  return `<script type="application/ld+json">${JSON.stringify(data).replaceAll(
    "<",
    "\\u003c",
  )}</script>`;
}

function pageTemplate({
  states,
  generatedAt,
  year,
}) {
  const YEAR = year;

  const defaultState =
    states.find((state) => {
      return state.code === DEFAULT_STATE_CODE;
    }) || states[0];

  if (!defaultState) {
    throw new Error(
      `No public holiday states available for ${YEAR}`,
    );
  }

  const title =
    `Urlaubsplaner ${YEAR}: Brückentage und freie Tage optimieren`;
  const description =
    `Urlaubsplaner ${YEAR}: Finde lange freie Zeiträume mit wenigen Urlaubstagen. Brückentage und Feiertage für alle 16 Bundesländer vergleichen.`;

  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta
      name="keywords"
      content="Urlaubsplaner ${YEAR}, Brückentage ${YEAR}, Urlaubstage optimieren ${YEAR}, Feiertage ${YEAR}, freie Tage ${YEAR}"
    />
    <link
      rel="canonical"
      href="https://www.schulferienklar.de/urlaubsplaner-${YEAR}.html"
    />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="stylesheet" href="/seo-pages.css" />
    <link rel="stylesheet" href="/urlaubsplaner.css" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta
      property="og:url"
      content="https://www.schulferienklar.de/urlaubsplaner-${YEAR}.html"
    />
    <meta
      property="og:image"
      content="https://www.schulferienklar.de/og-image.png"
    />
    ${structuredDataHtml(YEAR)}
  </head>
  <body class="seo-page planner-body" data-page="urlaubsplaner-${YEAR}">
    <main class="planner-page">
      <nav class="planner-nav" aria-label="Hauptnavigation">
        <a class="planner-brand" href="/">
          <span aria-hidden="true">✓</span>
          Schulferienklar
        </a>
        <div>
          <a href="/schulferien-${YEAR}.html">Schulferien ${YEAR}</a>
          <a href="/datenquellen.html">Datenquellen</a>
        </div>
      </nav>

      <section class="planner-hero">
        <p class="eyebrow">Urlaubstage clever einsetzen</p>
        <h1>Urlaubsplaner ${YEAR}</h1>
        <p class="planner-lead">
          Vergleiche Brückentage und lange freie Zeiträume für alle
          Bundesländer. Der Rechner verbindet Wochenenden, landesweite
          Feiertage und deine verfügbaren Urlaubstage.
        </p>
        <div class="planner-actions">
          <a
            class="button"
            href="/?state=${defaultState.code}&year=${YEAR}&vacationDays=4#brueckentage"
          >
            Interaktiven Urlaubsplaner öffnen
          </a>
          <a class="planner-secondary-link" href="#bundeslaender">
            Bundesländer vergleichen
          </a>
        </div>
      </section>

      <section class="planner-section" id="beispiele">
        <p class="eyebrow">Beispielrechnung Bayern</p>
        <h2>Was bringen 1 bis 5 Urlaubstage?</h2>
        <p>
          Die folgenden Beispiele zeigen jeweils die bestbewertete
          Kombination mit höchstens der angegebenen Zahl an Urlaubstagen.
          Im Rechner kannst du Bundesland, Jahr und Budget selbst ändern.
        </p>
        <div class="planner-budget-grid">
${budgetExamplesHtml(defaultState, YEAR)}
        </div>
      </section>

      <section class="planner-section" id="bundeslaender">
        <p class="eyebrow">Alle 16 Bundesländer</p>
        <h2>Urlaubstage ${YEAR} nach Bundesland planen</h2>
        <p>
          Als schnelle Orientierung zeigt jede Karte eine gute Kombination
          mit höchstens vier Urlaubstagen. Öffne anschließend den Rechner,
          um dein eigenes Urlaubstage-Budget festzulegen.
        </p>
        <div class="planner-state-grid">
${stateCardsHtml(states, YEAR)}
        </div>
      </section>

      <section class="planner-section planner-method">
        <p class="eyebrow">So wird gerechnet</p>
        <h2>Wochenenden, Feiertage und Urlaubstage</h2>
        <div class="planner-method-grid">
          <article>
            <strong>1. Gesetzliche Feiertage</strong>
            <p>
              Berücksichtigt werden landesweit geltende gesetzliche
              Feiertage des ausgewählten Bundeslands.
            </p>
          </article>
          <article>
            <strong>2. Wochenenden</strong>
            <p>
              Samstage und Sonntage werden als regulär freie Tage behandelt.
            </p>
          </article>
          <article>
            <strong>3. Urlaubstage</strong>
            <p>
              Arbeitstage zwischen freien Tagen werden als benötigte
              Urlaubstage ausgewiesen.
            </p>
          </article>
        </div>
        <p class="planner-note">
          Nicht berücksichtigt werden lokale Feiertage, individuelle
          Schichtmodelle, Teilzeitregelungen, Betriebsferien oder persönliche
          arbeitsfreie Wochentage. Die Ergebnisse sind Planungshilfen und
          keine arbeitsrechtliche Auskunft.
        </p>
      </section>

      <section class="planner-section">
        <p class="eyebrow">Häufige Fragen</p>
        <h2>Fragen zum Urlaubsplaner ${YEAR}</h2>
        <div class="planner-faq">
          <details>
            <summary>Wie funktioniert der Urlaubsplaner?</summary>
            <p>
              Er sucht im Kalenderjahr nach zusammenhängenden Zeiträumen,
              in denen Wochenenden und Feiertage mit möglichst wenigen
              Urlaubstagen verbunden werden können.
            </p>
          </details>
          <details>
            <summary>Zählen Schulferien als arbeitsfreie Tage?</summary>
            <p>
              Nein. Schulferien werden nicht als freie Arbeitstage gerechnet.
              Sie können aber über die verlinkten Ferienseiten zusätzlich
              für Familien- und Reiseplanung geprüft werden.
            </p>
          </details>
          <details>
            <summary>Warum unterscheiden sich Bundesländer?</summary>
            <p>
              Neben bundesweiten Feiertagen gibt es Feiertage, die nur in
              bestimmten Bundesländern gelten.
            </p>
          </details>
          <details>
            <summary>Werden lokale Feiertage berücksichtigt?</summary>
            <p>
              Nein. Der Rechner nutzt nur Feiertage, die im Datensatz als
              landesweit und standardmäßig kalenderrelevant markiert sind.
            </p>
          </details>
        </div>
      </section>

      <section class="planner-source">
        <h2>Datenstand und Quellen</h2>
        <p>
          Feiertagsdaten im Datensatz zuletzt geprüft:
          <strong>${escapeHtml(formatDatasetDate(generatedAt))}</strong>.
          Die konkreten Quellen und Prüfdaten findest du auf der
          <a href="/datenquellen.html">Datenquellen-Seite</a>.
        </p>
      </section>

      <footer class="planner-footer">
        <a href="/">Schulferienklar</a>
        <a href="/ueber-uns.html">Über uns</a>
        <a href="/datenschutz.html">Datenschutz</a>
        <a href="/impressum.html">Impressum</a>
      </footer>
    </main>
  </body>
</html>`;
}

const publicHolidayIndex =
  nodeHolidayRepository.loadPublicHolidayIndex();

for (const year of YEARS) {
  const states = getStateData(
    publicHolidayIndex,
    year,
  );

  const fileName =
    `urlaubsplaner-${year}.html`;

  fs.writeFileSync(
    path.join(outputDir, fileName),
    `${pageTemplate({
      states,
      year,
      generatedAt:
        publicHolidayIndex.generatedAt ||
        null,
    }).replace(/[ \\t]+$/gm, "")}\n`,
    "utf8",
  );

  console.log(
    `created ${fileName} ` +
      `(${states.length} states)`,
  );
}
