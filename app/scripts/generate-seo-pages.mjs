import fs from "node:fs";
import path from "node:path";

import {
  nodeHolidayRepository,
} from "./lib/node-data-repository.mjs";
import {
  STATES as states,
  YEARS as years,
} from "./lib/site-config.mjs";

const outputDir = path.resolve("public");

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function cleanGeneratedHtml(html) {
  return html.replace(/[ \t]+$/gm, "");
}

function formatDate(dateKey) {
  const [year, month, day] = String(dateKey).split("-");
  return `${day}.${month}.${year}`;
}

function parseDateKey(dateKey) {
  const [year, month, day] = String(dateKey).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function addDaysToDateKey(dateKey, amount) {
  const date = parseDateKey(dateKey);
  date.setUTCDate(date.getUTCDate() + amount);
  return toDateKey(date);
}

function daysInclusive(startDate, endDate) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.round(
    (parseDateKey(endDate) - parseDateKey(startDate)) / millisecondsPerDay
  ) + 1;
}

function isWeekendDateKey(dateKey) {
  const day = parseDateKey(dateKey).getUTCDay();
  return day === 0 || day === 6;
}

function formatCalendarDayCount(count) {
  return `${count} ${count === 1 ? "Kalendertag" : "Kalendertage"}`;
}

function getHolidayName(holiday) {
  if (typeof holiday.name === "string") {
    return holiday.name;
  }

  return holiday.name?.de || holiday.title?.de || "Schulferien";
}

function getCategoryLabel(category) {
  if (category === "school_free") {
    return "Unterrichtsfrei";
  }

  return "Ferien";
}

function getEventsForStateAndYear({ holidayIndex, code, year }) {
  const dataset = holidayIndex.datasets?.find((item) => {
    return item.bundeslandCode === code;
  });

  if (!dataset?.jsonFile) {
    return [];
  }

  const datasetJson =
    nodeHolidayRepository.loadSchoolHolidayDatasetByMeta(
      dataset,
    );

  if (!datasetJson) {
    return [];
  }

  const events =
    datasetJson.holidays || datasetJson.events || [];

  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  return events
    .filter((event) => {
      return event.startDate <= yearEnd && event.endDate >= yearStart;
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

function getSchoolHolidaySourceForState({ holidayIndex, code }) {
  const dataset = holidayIndex.datasets?.find((item) => {
    return item.bundeslandCode === code;
  });

  if (!dataset?.jsonFile) {
    return null;
  }

  const datasetJson =
    nodeHolidayRepository.loadSchoolHolidayDatasetByMeta(
      dataset,
    );

  return datasetJson?.sources?.[0] || null;
}


function getSchoolHolidayDatasetForState({
  holidayIndex,
  code,
}) {
  const dataset =
    holidayIndex.datasets?.find((item) => {
      return item.bundeslandCode === code;
    });

  if (!dataset?.jsonFile) {
    return null;
  }

  return (
    nodeHolidayRepository
      .loadSchoolHolidayDatasetByMeta(
        dataset,
      ) ||
    null
  );
}

function getPublicHolidaysForStateAndYear({
  publicHolidayIndex,
  code,
  year,
}) {
  const dataset = publicHolidayIndex.datasets?.find((item) => {
    return item.bundeslandCode === code && item.year === year;
  });

  if (!dataset?.jsonFile) {
    return [];
  }

  const datasetJson =
    nodeHolidayRepository.loadPublicHolidayDatasetByMeta(
      dataset,
    );

  return (
    datasetJson?.holidays ||
    datasetJson?.events ||
    []
  );
}

function getPublicHolidaysAroundYear({
  publicHolidayIndex,
  code,
  year,
}) {
  return [year - 1, year, year + 1].flatMap((itemYear) => {
    return getPublicHolidaysForStateAndYear({
      publicHolidayIndex,
      code,
      year: itemYear,
    });
  });
}

function isConnectedFreeDate(dateKey, publicHolidays) {
  if (isWeekendDateKey(dateKey)) {
    return true;
  }

  return publicHolidays.some((holiday) => {
    return (
      holiday.date === dateKey &&
      holiday.includeInDefaultCalendar === true &&
      holiday.scope === "statewide"
    );
  });
}

function getConnectedFreePeriod(event, publicHolidays) {
  let startDate = event.startDate;
  let endDate = event.endDate;

  while (
    isConnectedFreeDate(addDaysToDateKey(startDate, -1), publicHolidays)
  ) {
    startDate = addDaysToDateKey(startDate, -1);
  }

  while (
    isConnectedFreeDate(addDaysToDateKey(endDate, 1), publicHolidays)
  ) {
    endDate = addDaysToDateKey(endDate, 1);
  }

  return {
    startDate,
    endDate,
    dayCount: daysInclusive(startDate, endDate),
  };
}

function stateYearQuickSummaryHtml(events, name, year) {
  if (events.length === 0) {
    return "";
  }

  const items = events
    .slice(0, 7)
    .map((event) => {
      return `          <li>
            <span>${escapeHtml(getHolidayName(event))}</span>
            <strong>${formatDate(event.startDate)} – ${formatDate(event.endDate)}</strong>
          </li>`;
    })
    .join("\n");

  return `        <div class="quick-summary" aria-label="Kurzübersicht Schulferien ${escapeHtml(name)} ${year}">
          <div>
            <p class="quick-summary-label">Kurzübersicht</p>
            <h2>Wichtige Ferien ${escapeHtml(name)} ${year}</h2>
          </div>
          <ul>
${items}
          </ul>
          <p class="quick-summary-note">
            Im Kalender kannst du Ferien, Feiertage und freie Zeiten für ${escapeHtml(name)} ${year} genauer prüfen.
            <a href="/?state=${events[0]?.bundeslandCode || ""}&year=${year}">Kalender ${escapeHtml(name)} ${year} öffnen</a>
          </p>
        </div>
`;
}

function stateYearQueryIntroHtml(name, year, events) {
  const hasSummerHoliday = events.some((event) => {
    const label = String(event.name?.de || event.name || event.type || "").toLowerCase();
    const type = String(event.type || "").toLowerCase();

    return label.includes("sommerferien") || type.includes("summer");
  });

  return `
        <h2>Ferien ${escapeHtml(name)} ${year} im Überblick</h2>
        <p>
          Hier findest du die Schulferien ${escapeHtml(name)} ${year} mit allen wichtigen Ferienterminen.
          Der Kalender hilft dir, Ferien ${escapeHtml(name)} ${year}, gesetzliche Feiertage und mögliche Brückentage schneller zu prüfen.
        </p>
        <p>
          Die Übersicht eignet sich für Familien, Schüler:innen, Reiseplanung und alle, die freie Tage im Jahr ${year} besser vergleichen möchten.
        </p>
        ${
          hasSummerHoliday
            ? `<h2>Sommerferien ${escapeHtml(name)} ${year}</h2>
        <p>
          Die Sommerferien ${escapeHtml(name)} ${year} gehören zu den wichtigsten Ferienzeiträumen für Urlaub, Betreuung und Reiseplanung.
          Auf dieser Seite siehst du die offiziellen Daten im Kalender und kannst angrenzende Feiertage oder freie Zeiträume leichter einordnen.
        </p>`
            : ""
        }`;
}

function holidaySummaryHtml(events, name, year) {
  if (events.length === 0) {
    return `<p>Für ${escapeHtml(name)} ${year} sind in Schulferienklar aktuell keine Ferien-Einträge verfügbar.</p>`;
  }

  const items = events
    .map((event) => {
      const label = getCategoryLabel(event.category);
      const eventName = getHolidayName(event);
      return `          <li>
            <strong>${escapeHtml(eventName)} ${escapeHtml(name)} ${year}</strong>
            <span>${formatDate(event.startDate)} – ${formatDate(event.endDate)}</span>
            <small>${label}</small>
          </li>`;
    })
    .join("\n");

  return `<ul class="holiday-summary-list">
${items}
        </ul>`;
}



function getBayern2027DisplayName(event) {
  if (event.type === "spring") {
    return "Frühjahrsferien (oft Faschingsferien)";
  }

  if (event.type === "all_saints") {
    return "Unterrichtsfreie Tage um Allerheiligen";
  }

  return getHolidayName(event);
}

function getBayern2027PeriodNote(event) {
  if (event.startDate < "2027-01-01") {
    return "Beginnt im Dezember 2026 und reicht in das Kalenderjahr 2027.";
  }

  if (event.endDate > "2027-12-31") {
    return "Beginnt im Dezember 2027 und reicht in das Kalenderjahr 2028.";
  }

  if (event.type === "spring") {
    return "Die offizielle Bezeichnung lautet Frühjahrsferien.";
  }

  if (event.type === "all_saints") {
    return "Offizielle bayerische Bezeichnung; häufig als Herbstferien gesucht.";
  }

  return "";
}

function bayern2027PeriodRowsHtml(
  events,
  publicHolidays,
) {
  return stateYearGoldPeriodRowsHtml({
    events,
    publicHolidays,
    year: 2027,
    getDisplayName:
      getBayern2027DisplayName,
    getPeriodNote:
      getBayern2027PeriodNote,
  });
}

function findBayern2027Event(
  events,
  type,
) {
  return findStateYearGoldEvent(
    events,
    type,
    2027,
  );
}

function createBayern2027FaqItems(events) {
  const summer = findBayern2027Event(events, "summer");
  const spring = findBayern2027Event(events, "spring");
  const easter = findBayern2027Event(events, "easter");
  const pentecost = findBayern2027Event(events, "pentecost");
  const allSaints = findBayern2027Event(events, "all_saints");

  const rangeText = (event) => {
    if (!event) {
      return "Für diesen Zeitraum liegt aktuell kein Eintrag vor.";
    }

    return `${formatDate(event.startDate)} bis ${formatDate(event.endDate)}`;
  };

  return [
    {
      question: "Wann sind die Sommerferien in Bayern 2027?",
      answer: `Die Sommerferien in Bayern 2027 dauern vom ${rangeText(summer)}.`,
    },
    {
      question: "Wann sind die Osterferien in Bayern 2027?",
      answer: `Die Osterferien in Bayern 2027 dauern vom ${rangeText(easter)}.`,
    },
    {
      question: "Wann sind die Pfingstferien in Bayern 2027?",
      answer: `Die Pfingstferien in Bayern 2027 dauern vom ${rangeText(pentecost)}.`,
    },
    {
      question: "Wann sind die Faschingsferien in Bayern 2027?",
      answer: `Die häufig als Faschingsferien bezeichneten Frühjahrsferien dauern vom ${rangeText(spring)}. Die offizielle Bezeichnung in Bayern lautet Frühjahrsferien.`,
    },
    {
      question: "Gibt es Herbstferien in Bayern 2027?",
      answer: `Bayern veröffentlicht dafür die Bezeichnung „unterrichtsfreie Tage um Allerheiligen“. 2027 liegen diese Tage vom ${rangeText(allSaints)}.`,
    },
    {
      question: "Wie berechnet Schulferienklar die zusammenhängende freie Zeit?",
      answer:
        "Schulferienklar erweitert einen offiziellen Ferienzeitraum nur um direkt angrenzende Samstage, Sonntage und landesweit geltende gesetzliche Feiertage. Regionale und lokale Feiertage werden dabei nicht eingerechnet.",
    },
  ];
}

function bayern2027FaqHtml(
  faqItems,
) {
  return stateYearGoldFaqHtml({
    faqItems,
    name: "Bayern",
    year: 2027,
  });
}

function bayern2027StructuredDataHtml(
  faqItems,
) {
  return stateYearGoldStructuredDataHtml({
    faqItems,
    slug: "bayern",
    name: "Bayern",
    year: 2027,
  });
}

function bayern2027SourceHtml(source) {
  if (!source) {
    return `        <section id="quelle" class="gold-section">
          <h2>Quelle und Datenstand</h2>
          <p>
            Die Schulferiendaten stammen aus dem hinterlegten Bayern-Datensatz.
            Für verbindliche Auskünfte ist die offizielle Veröffentlichung des
            Freistaats Bayern maßgeblich.
          </p>
        </section>`;
  }

  return `        <section id="quelle" class="gold-section">
          <p class="eyebrow">Nachvollziehbare Daten</p>
          <h2>Offizielle Quelle und Datenstand</h2>
          <div class="gold-source-card">
            <p>
              <strong>Quelle für die Schulferien:</strong><br />
              ${escapeHtml(source.sourceName)}
            </p>
            <p>
              <strong>Rechtsgrundlage:</strong><br />
              ${escapeHtml(source.legalTitle || "Offizielle Ferienordnung des Freistaats Bayern")}
            </p>
            <p>
              <strong>Zuletzt im Datensatz geprüft:</strong><br />
              ${formatDate(source.lastCheckedAt)}
            </p>
            <div class="gold-source-links">
              <a href="${escapeHtml(source.sourceUrl)}">Ferienordnung bei Bayern.Recht</a>
              ${
                source.secondarySourceUrl
                  ? `<a href="${escapeHtml(source.secondarySourceUrl)}">Übersicht des Kultusministeriums</a>`
                  : ""
              }
            </div>
          </div>
          <p class="gold-source-note">
            Schul- oder schulartspezifische Abweichungen sind nicht Bestandteil
            dieser landesweiten Standardübersicht. Für verbindliche Auskünfte
            bleibt die offizielle Veröffentlichung maßgeblich.
          </p>
        </section>`;
}



function findStateYearGoldEvent(
  events,
  type,
  year,
) {
  return events.find((event) => {
    return (
      event.type === type &&
      event.startDate.startsWith(String(year))
    );
  });
}

function getStateYearCrossingNote(
  event,
  year,
) {
  if (
    event.startDate <
    `${year}-01-01`
  ) {
    return `Beginnt im Vorjahr und reicht in das Kalenderjahr ${year}.`;
  }

  if (
    event.endDate >
    `${year}-12-31`
  ) {
    return `Beginnt im Kalenderjahr ${year} und reicht in das Folgejahr.`;
  }

  return "";
}

function isSchoolFreeDate(
  dateKey,
  schoolEvents,
) {
  return schoolEvents.some((event) => {
    return (
      event.includeInDefaultCalendar !== false &&
      event.startDate <= dateKey &&
      event.endDate >= dateKey
    );
  });
}

function getConnectedFreePeriodWithSchoolEvents(
  event,
  publicHolidays,
  schoolEvents,
) {
  let startDate = event.startDate;
  let endDate = event.endDate;

  const isFreeDate = (dateKey) => {
    return (
      isConnectedFreeDate(
        dateKey,
        publicHolidays,
      ) ||
      isSchoolFreeDate(
        dateKey,
        schoolEvents,
      )
    );
  };

  while (
    isFreeDate(
      addDaysToDateKey(
        startDate,
        -1,
      ),
    )
  ) {
    startDate =
      addDaysToDateKey(
        startDate,
        -1,
      );
  }

  while (
    isFreeDate(
      addDaysToDateKey(
        endDate,
        1,
      ),
    )
  ) {
    endDate =
      addDaysToDateKey(
        endDate,
        1,
      );
  }

  return {
    startDate,
    endDate,
    dayCount:
      daysInclusive(
        startDate,
        endDate,
      ),
  };
}

function stateYearGoldPeriodRowsHtml({
  events,
  publicHolidays,
  year,
  getDisplayName,
  getPeriodNote,
  getConnectedPeriod,
}) {
  const displayName =
    getDisplayName || getHolidayName;

  const periodNote =
    getPeriodNote ||
    ((event) => {
      return getStateYearCrossingNote(
        event,
        year,
      );
    });

  const connectedPeriodForEvent =
    getConnectedPeriod ||
    ((event) => {
      return getConnectedFreePeriod(
        event,
        publicHolidays,
      );
    });

  return events
    .map((event) => {
      const connectedPeriod =
        connectedPeriodForEvent(
          event,
        );

      const officialDayCount =
        daysInclusive(
          event.startDate,
          event.endDate,
        );

      const note =
        periodNote(event);

      const eventId =
        `termin-${String(event.id || event.type)
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, "-")}`;

      return `            <li class="gold-period-row" id="${eventId}">
              <div class="gold-period-name">
                <strong>${escapeHtml(displayName(event))}</strong>
                ${
                  note
                    ? `<small>${escapeHtml(note)}</small>`
                    : ""
                }
              </div>
              <div class="gold-period-value">
                <span>Offizieller Zeitraum</span>
                <strong>${formatDate(event.startDate)} – ${formatDate(event.endDate)}</strong>
                <small>${formatCalendarDayCount(officialDayCount)}</small>
              </div>
              <div class="gold-period-value gold-period-connected">
                <span>Zusammenhängend frei</span>
                <strong>${formatDate(connectedPeriod.startDate)} – ${formatDate(connectedPeriod.endDate)}</strong>
                <small>${formatCalendarDayCount(connectedPeriod.dayCount)}</small>
              </div>
            </li>`;
    })
    .join("\n");
}

function stateYearGoldFaqHtml({
  faqItems,
  name,
  year,
}) {
  const items = faqItems
    .map((item) => {
      return `          <article class="gold-faq-item">
            <h3>${escapeHtml(item.question)}</h3>
            <p>${escapeHtml(item.answer)}</p>
          </article>`;
    })
    .join("\n");

  return `        <section id="fragen" class="gold-section">
          <p class="eyebrow">Direkte Antworten</p>
          <h2>Häufige Fragen zu den Schulferien ${escapeHtml(name)} ${year}</h2>
          <div class="gold-faq-list">
${items}
          </div>
        </section>`;
}

function stateYearGoldStructuredDataHtml({
  faqItems,
  slug,
  name,
  year,
}) {
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
            name: `Schulferien ${name}`,
            item:
              `https://www.schulferienklar.de/schulferien-${slug}.html`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: `Schulferien ${name} ${year}`,
            item:
              `https://www.schulferienklar.de/schulferien-${slug}-${year}.html`,
          },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: faqItems.map(
          (item) => {
            return {
              "@type": "Question",
              name: item.question,
              acceptedAnswer: {
                "@type": "Answer",
                text: item.answer,
              },
            };
          },
        ),
      },
    ],
  };

  const json =
    JSON.stringify(data)
      .replaceAll("<", "\\u003c");

  return `    <script type="application/ld+json">${json}</script>`;
}

function stateYearGoldSourceHtml({
  source,
  name,
  sourceLinkLabel,
  secondaryLinkLabel,
}) {
  if (!source) {
    return `        <section id="quelle" class="gold-section">
          <h2>Quelle und Datenstand</h2>
          <p>
            Die Schulferiendaten stammen aus dem hinterlegten
            Datensatz für ${escapeHtml(name)}. Für verbindliche
            Auskünfte ist die offizielle Veröffentlichung des
            Bundeslandes maßgeblich.
          </p>
        </section>`;
  }

  const checkedAt =
    source.lastCheckedAt
      ? formatDate(source.lastCheckedAt)
      : "nicht angegeben";

  return `        <section id="quelle" class="gold-section">
          <p class="eyebrow">Nachvollziehbare Daten</p>
          <h2>Offizielle Quelle und Datenstand</h2>
          <div class="gold-source-card">
            <p>
              <strong>Quelle für die Schulferien:</strong><br />
              ${escapeHtml(source.sourceName)}
            </p>
            <p>
              <strong>Rechtsgrundlage:</strong><br />
              ${escapeHtml(
                source.legalTitle ||
                `Offizielle Ferienordnung für ${name}`,
              )}
            </p>
            <p>
              <strong>Zuletzt im Datensatz geprüft:</strong><br />
              ${checkedAt}
            </p>
            <div class="gold-source-links">
              <a href="${escapeHtml(source.sourceUrl)}">
                ${escapeHtml(sourceLinkLabel)}
              </a>
              ${
                source.secondarySourceUrl &&
                secondaryLinkLabel
                  ? `<a href="${escapeHtml(source.secondarySourceUrl)}">${escapeHtml(secondaryLinkLabel)}</a>`
                  : ""
              }
            </div>
          </div>
          <p class="gold-source-note">
            Schul- oder ortsspezifische Abweichungen sind nicht
            Bestandteil dieser landesweiten Standardübersicht.
            Für verbindliche Auskünfte bleibt die offizielle
            Veröffentlichung beziehungsweise die eigene Schule
            maßgeblich.
          </p>
        </section>`;
}

function stateYearGoldRelatedLinksHtml(
  links,
) {
  const items = links
    .map((link) => {
      return `            <li><a href="${link.href}">${escapeHtml(link.label)}</a></li>`;
    })
    .join("\n");

  return `        <section class="gold-section">
          <h2>Passende Ferienübersichten</h2>
          <ul class="holiday-summary-list seo-link-list gold-related-links">
${items}
          </ul>
        </section>`;
}

function getNrw2027DisplayName(event) {
  if (event.type === "pentecost") {
    return "Pfingsten (ein Ferientag)";
  }

  return getHolidayName(event);
}

function getNrw2027PeriodNote(event) {
  const crossingNote =
    getStateYearCrossingNote(
      event,
      2027,
    );

  if (crossingNote) {
    return crossingNote;
  }

  if (event.type === "pentecost") {
    return "Die Ferienordnung nennt Dienstag, den 18. Mai 2027.";
  }

  return "";
}

function createNrw2027FaqItems(events) {
  const summer =
    findStateYearGoldEvent(
      events,
      "summer",
      2027,
    );

  const easter =
    findStateYearGoldEvent(
      events,
      "easter",
      2027,
    );

  const pentecost =
    findStateYearGoldEvent(
      events,
      "pentecost",
      2027,
    );

  const autumn =
    findStateYearGoldEvent(
      events,
      "autumn",
      2027,
    );

  const christmas =
    findStateYearGoldEvent(
      events,
      "christmas",
      2027,
    );

  const rangeText = (event) => {
    if (!event) {
      return "Für diesen Zeitraum liegt aktuell kein Eintrag vor.";
    }

    return (
      `${formatDate(event.startDate)} bis ` +
      `${formatDate(event.endDate)}`
    );
  };

  return [
    {
      question:
        "Wann sind die Sommerferien in NRW 2027?",
      answer:
        `Die Sommerferien in Nordrhein-Westfalen 2027 dauern vom ${rangeText(summer)}.`,
    },
    {
      question:
        "Wann sind die Osterferien in NRW 2027?",
      answer:
        `Die Osterferien in Nordrhein-Westfalen 2027 dauern vom ${rangeText(easter)}.`,
    },
    {
      question:
        "Wann sind die Herbstferien in NRW 2027?",
      answer:
        `Die Herbstferien in Nordrhein-Westfalen 2027 dauern vom ${rangeText(autumn)}.`,
    },
    {
      question:
        "Wann sind die Weihnachtsferien in NRW 2027?",
      answer:
        `Die Weihnachtsferien beginnen am ${christmas ? formatDate(christmas.startDate) : "nicht angegeben"} und enden am ${christmas ? formatDate(christmas.endDate) : "nicht angegeben"}.`,
    },
    {
      question:
        "Gibt es Pfingstferien in NRW 2027?",
      answer:
        `Die offizielle Ferienordnung nennt für 2027 Dienstag, den ${pentecost ? formatDate(pentecost.startDate) : "18.05.2027"}, als Ferientag zu Pfingsten. Der landesweit festgelegte Ferienzeitraum umfasst einen Tag.`,
    },
    {
      question:
        "Wie viele bewegliche Ferientage gibt es in NRW 2027?",
      answer:
        "In den Schuljahren 2026/27 und 2027/28 gibt es jeweils drei bewegliche Ferientage. Die Schulkonferenz legt die Termine im Einvernehmen mit dem Schulträger fest. Eltern erfahren die konkreten Termine direkt bei ihrer Schule.",
    },
    {
      question:
        "Ist Rosenmontag 2027 in NRW überall schulfrei?",
      answer:
        "Rosenmontag ist kein landesweit einheitlicher Ferientermin. Je nach örtlicher Entscheidung kann er als beweglicher Ferientag festgelegt werden. Maßgeblich ist die Information der jeweiligen Schule.",
    },
    {
      question:
        "Wie berechnet Schulferienklar die zusammenhängende freie Zeit?",
      answer:
        "Schulferienklar erweitert einen offiziellen Ferienzeitraum nur um direkt angrenzende Samstage, Sonntage und landesweit geltende gesetzliche Feiertage. Schulabhängige bewegliche Ferientage werden nicht automatisch eingerechnet.",
    },
  ];
}


function getBw2027DisplayName(event) {
  if (
    event.category ===
    "state_school_free_day"
  ) {
    return "Schulfrei am Gründonnerstag";
  }

  return getHolidayName(event);
}

function getBw2027PeriodNote(event) {
  const crossingNote =
    getStateYearCrossingNote(
      event,
      2027,
    );

  if (crossingNote) {
    return crossingNote;
  }

  if (
    event.category ===
    "state_school_free_day"
  ) {
    return "Landesweit schulfrei laut Fußnote der offiziellen Ferienübersicht.";
  }

  return "";
}

function findBw2027SchoolFreeDay(
  events,
) {
  return events.find((event) => {
    return (
      event.category ===
        "state_school_free_day" &&
      event.startDate ===
        "2027-03-25"
    );
  });
}

function createBw2027FaqItems(events) {
  const summer =
    findStateYearGoldEvent(
      events,
      "summer",
      2027,
    );

  const easter =
    findStateYearGoldEvent(
      events,
      "easter",
      2027,
    );

  const pentecost =
    findStateYearGoldEvent(
      events,
      "pentecost",
      2027,
    );

  const autumn =
    findStateYearGoldEvent(
      events,
      "autumn",
      2027,
    );

  const christmas =
    findStateYearGoldEvent(
      events,
      "christmas",
      2027,
    );

  const schoolFreeDay =
    findBw2027SchoolFreeDay(
      events,
    );

  const rangeText = (event) => {
    if (!event) {
      return (
        "Für diesen Zeitraum liegt " +
        "aktuell kein Eintrag vor."
      );
    }

    return (
      `${formatDate(event.startDate)} bis ` +
      `${formatDate(event.endDate)}`
    );
  };

  return [
    {
      question:
        "Wann sind die Sommerferien in Baden-Württemberg 2027?",
      answer:
        `Die Sommerferien in Baden-Württemberg 2027 dauern vom ${rangeText(summer)}.`,
    },
    {
      question:
        "Wann sind die Osterferien in Baden-Württemberg 2027?",
      answer:
        `Die Osterferien dauern vom ${rangeText(easter)}. Zusätzlich ist Gründonnerstag, der ${schoolFreeDay ? formatDate(schoolFreeDay.startDate) : "25.03.2027"}, landesweit schulfrei.`,
    },
    {
      question:
        "Ist Gründonnerstag 2027 in Baden-Württemberg schulfrei?",
      answer:
        `Ja. Die offizielle Ferienübersicht weist Donnerstag, den ${schoolFreeDay ? formatDate(schoolFreeDay.startDate) : "25.03.2027"}, ausdrücklich als schulfrei aus.`,
    },
    {
      question:
        "Wann sind die Pfingstferien in Baden-Württemberg 2027?",
      answer:
        `Die Pfingstferien in Baden-Württemberg 2027 dauern vom ${rangeText(pentecost)}.`,
    },
    {
      question:
        "Wann sind die Herbstferien in Baden-Württemberg 2027?",
      answer:
        `Die Herbstferien in Baden-Württemberg 2027 dauern vom ${rangeText(autumn)}.`,
    },
    {
      question:
        "Wann sind die Weihnachtsferien in Baden-Württemberg 2027?",
      answer:
        `Die Weihnachtsferien beginnen am ${christmas ? formatDate(christmas.startDate) : "nicht angegeben"} und enden am ${christmas ? formatDate(christmas.endDate) : "nicht angegeben"}.`,
    },
    {
      question:
        "Sind bewegliche Ferientage und unterrichtsfreie Samstage enthalten?",
      answer:
        "Nein. Bewegliche Ferientage und unterrichtsfreie Samstage sind im landesweiten Standarddatensatz von Schulferienklar nicht enthalten. Konkrete zusätzliche schulfreie Termine sollten bei der eigenen Schule beziehungsweise in der offiziellen Ferienübersicht geprüft werden.",
    },
    {
      question:
        "Gibt es landesweite Fastnachtsferien in Baden-Württemberg 2027?",
      answer:
        "Der landesweite Standarddatensatz enthält keinen einheitlichen Ferienzeitraum mit der Bezeichnung Fastnachtsferien. Zusätzliche freie Tage können je nach Schule abweichen und werden deshalb nicht automatisch eingerechnet.",
    },
    {
      question:
        "Wie berechnet Schulferienklar die zusammenhängende freie Zeit?",
      answer:
        "Schulferienklar verbindet offizielle Ferienzeiten mit unmittelbar angrenzenden Wochenenden, landesweiten Feiertagen und ausdrücklich landesweit ausgewiesenen schulfreien Tagen. Bewegliche Ferientage und unterrichtsfreie Samstage werden nicht automatisch eingerechnet.",
    },
  ];
}


function getNi2027DisplayName(event) {
  if (
    event.category ===
    "state_school_free_day"
  ) {
    return "Tag nach Himmelfahrt (schulfrei)";
  }

  if (event.type === "pentecost") {
    return "Pfingsten (ein Ferientag)";
  }

  if (event.type === "winter") {
    return "Halbjahresferien";
  }

  return getHolidayName(event);
}

function getNi2027PeriodNote(event) {
  const crossingNote =
    getStateYearCrossingNote(
      event,
      2027,
    );

  if (crossingNote) {
    return crossingNote;
  }

  if (
    event.category ===
      "state_school_free_day" &&
    event.startDate ===
      "2027-05-07"
  ) {
    return (
      "Landesweit schulfreier Tag laut " +
      "Ferienordnung: Freitag, 7. Mai 2027."
    );
  }

  if (event.type === "pentecost") {
    return (
      "Die Ferienordnung nennt Dienstag, " +
      "den 18. Mai 2027."
    );
  }

  return "";
}

function findNi2027SchoolFreeDay(
  events,
) {
  return events.find((event) => {
    return (
      event.category ===
        "state_school_free_day" &&
      event.startDate ===
        "2027-05-07"
    );
  });
}

function createNi2027FaqItems(events) {
  const winter =
    findStateYearGoldEvent(
      events,
      "winter",
      2027,
    );

  const easter =
    findStateYearGoldEvent(
      events,
      "easter",
      2027,
    );

  const pentecost =
    findStateYearGoldEvent(
      events,
      "pentecost",
      2027,
    );

  const summer =
    findStateYearGoldEvent(
      events,
      "summer",
      2027,
    );

  const autumn =
    findStateYearGoldEvent(
      events,
      "autumn",
      2027,
    );

  const christmas =
    findStateYearGoldEvent(
      events,
      "christmas",
      2027,
    );

  const schoolFreeDay =
    findNi2027SchoolFreeDay(
      events,
    );

  const rangeText = (event) => {
    if (!event) {
      return (
        "Für diesen Zeitraum liegt " +
        "aktuell kein Eintrag vor."
      );
    }

    return (
      `${formatDate(event.startDate)} bis ` +
      `${formatDate(event.endDate)}`
    );
  };

  return [
    {
      question:
        "Wann sind die Halbjahresferien in Niedersachsen 2027?",
      answer:
        `Die Halbjahresferien in Niedersachsen 2027 dauern vom ${rangeText(winter)}.`,
    },
    {
      question:
        "Wann sind die Osterferien in Niedersachsen 2027?",
      answer:
        `Die Osterferien in Niedersachsen 2027 dauern vom ${rangeText(easter)}.`,
    },
    {
      question:
        "Ist der Tag nach Himmelfahrt 2027 in Niedersachsen schulfrei?",
      answer:
        `Ja. Die Ferienordnung nennt Freitag, den ${schoolFreeDay ? formatDate(schoolFreeDay.startDate) : "07.05.2027"}, als landesweit schulfreien Tag. Zusammen mit Christi Himmelfahrt und dem Wochenende ergibt sich freie Zeit vom 06.05. bis 09.05.2027.`,
    },
    {
      question:
        "Gibt es Pfingstferien in Niedersachsen 2027?",
      answer:
        `Die Ferienordnung nennt Dienstag, den ${pentecost ? formatDate(pentecost.startDate) : "18.05.2027"}, als Ferientag zu Pfingsten. Zusammen mit dem Wochenende und Pfingstmontag ergibt sich freie Zeit vom 15.05. bis 18.05.2027.`,
    },
    {
      question:
        "Wann sind die Sommerferien in Niedersachsen 2027?",
      answer:
        `Die Sommerferien in Niedersachsen 2027 dauern vom ${rangeText(summer)}.`,
    },
    {
      question:
        "Wann sind die Herbstferien in Niedersachsen 2027?",
      answer:
        `Die Herbstferien in Niedersachsen 2027 dauern vom ${rangeText(autumn)}.`,
    },
    {
      question:
        "Wann sind die Weihnachtsferien in Niedersachsen 2027?",
      answer:
        `Die Weihnachtsferien beginnen am ${christmas ? formatDate(christmas.startDate) : "nicht angegeben"} und enden am ${christmas ? formatDate(christmas.endDate) : "nicht angegeben"}.`,
    },
    {
      question:
        "Gelten die Ferientermine für alle Schulen in Niedersachsen?",
      answer:
        "Nicht ausnahmslos. Für bestimmte ausdrücklich genannte Schulen gelten abweichende Regelungen, darunter Schulen auf den Ostfriesischen Inseln. Schulferienklar zeigt die landesweite Standardregelung; bei einer betroffenen Schule ist deren eigener Ferienplan maßgeblich.",
    },
    {
      question:
        "Wie berechnet Schulferienklar die zusammenhängende freie Zeit?",
      answer:
        "Schulferienklar erweitert einen offiziellen Ferienzeitraum oder landesweit schulfreien Tag nur um direkt angrenzende Samstage, Sonntage und landesweit geltende gesetzliche Feiertage. Schul- oder ortsspezifische Abweichungen werden nicht automatisch eingerechnet.",
    },
  ];
}


function getBerlin2027DisplayName(event) {
  if (
    event.category ===
    "state_school_free_day"
  ) {
    return (
      "Unterrichtsfreier Tag nach AZVO " +
      "(schulfrei)"
    );
  }

  return getHolidayName(event);
}

function getBerlin2027PeriodNote(event) {
  const crossingNote =
    getStateYearCrossingNote(
      event,
      2027,
    );

  if (crossingNote) {
    return crossingNote;
  }

  if (
    event.category ===
      "state_school_free_day" &&
    event.startDate ===
      "2027-05-07"
  ) {
    return (
      "Landesweit unterrichtsfrei laut " +
      "Berliner Ferienordnung: " +
      "Freitag, 7. Mai 2027."
    );
  }

  if (event.type === "pentecost") {
    return (
      "Die Pfingstferien umfassen " +
      "Dienstag und Mittwoch, " +
      "18.–19. Mai 2027."
    );
  }

  return "";
}

function findBerlin2027SchoolFreeDay(
  events,
) {
  return events.find((event) => {
    return (
      event.category ===
        "state_school_free_day" &&
      event.startDate ===
        "2027-05-07"
    );
  });
}

function createBerlin2027FaqItems(events) {
  const winter =
    findStateYearGoldEvent(
      events,
      "winter",
      2027,
    );

  const easter =
    findStateYearGoldEvent(
      events,
      "easter",
      2027,
    );

  const pentecost =
    findStateYearGoldEvent(
      events,
      "pentecost",
      2027,
    );

  const summer =
    findStateYearGoldEvent(
      events,
      "summer",
      2027,
    );

  const autumn =
    findStateYearGoldEvent(
      events,
      "autumn",
      2027,
    );

  const christmas =
    findStateYearGoldEvent(
      events,
      "christmas",
      2027,
    );

  const schoolFreeDay =
    findBerlin2027SchoolFreeDay(
      events,
    );

  const rangeText = (event) => {
    if (!event) {
      return (
        "Für diesen Zeitraum liegt " +
        "aktuell kein Eintrag vor."
      );
    }

    return (
      `${formatDate(event.startDate)} bis ` +
      `${formatDate(event.endDate)}`
    );
  };

  return [
    {
      question:
        "Wann sind die Winterferien in Berlin 2027?",
      answer:
        `Die Winterferien in Berlin 2027 dauern vom ${rangeText(winter)}.`,
    },
    {
      question:
        "Wann sind die Osterferien in Berlin 2027?",
      answer:
        `Die Osterferien in Berlin 2027 dauern vom ${rangeText(easter)}.`,
    },
    {
      question:
        "Ist der 7. Mai 2027 in Berlin schulfrei?",
      answer:
        `Ja. Die Berliner Ferienordnung weist Freitag, den ${schoolFreeDay ? formatDate(schoolFreeDay.startDate) : "07.05.2027"}, als unterrichtsfreien Tag nach AZVO aus. Mit Christi Himmelfahrt und dem Wochenende ergibt sich freie Zeit vom 06.05. bis 09.05.2027.`,
    },
    {
      question:
        "Wann sind die Pfingstferien in Berlin 2027?",
      answer:
        `Die Pfingstferien in Berlin 2027 dauern vom ${rangeText(pentecost)}. Mit dem Wochenende und Pfingstmontag ergibt sich freie Zeit vom 15.05. bis 19.05.2027.`,
    },
    {
      question:
        "Wann sind die Sommerferien in Berlin 2027?",
      answer:
        `Die Sommerferien in Berlin 2027 dauern vom ${rangeText(summer)}.`,
    },
    {
      question:
        "Wann sind die Herbstferien in Berlin 2027?",
      answer:
        `Die Herbstferien in Berlin 2027 dauern vom ${rangeText(autumn)}.`,
    },
    {
      question:
        "Wann sind die Weihnachtsferien in Berlin 2027?",
      answer:
        `Die Weihnachtsferien beginnen am ${christmas ? formatDate(christmas.startDate) : "nicht angegeben"} und enden am ${christmas ? formatDate(christmas.endDate) : "nicht angegeben"}.`,
    },
    {
      question:
        "Ist der Internationale Frauentag 2027 in Berlin ein Feiertag?",
      answer:
        "Ja. Montag, der 8. März 2027, ist in Berlin ein gesetzlicher Feiertag.",
    },
    {
      question:
        "Gelten die Ferientermine für alle Berliner Schulen?",
      answer:
        "Nicht ausnahmslos. Berlin veröffentlicht für einzelne Schulen eigene Ferienordnungen, unter anderem für die John-F.-Kennedy-Schule, die Staatliche Ballettschule Berlin und Schule für Artistik, das Französische Gymnasium und die Staatliche Technikerschule. Diese Sonderkalender sind nicht Bestandteil der landesweiten Standardübersicht.",
    },
    {
      question:
        "Wie berechnet Schulferienklar die zusammenhängende freie Zeit?",
      answer:
        "Schulferienklar erweitert einen offiziellen Ferienzeitraum oder landesweit schulfreien Tag nur um direkt angrenzende Samstage, Sonntage und landesweit geltende gesetzliche Feiertage. Sonderkalender einzelner Schulen und religiöse Unterrichtsbefreiungen werden nicht automatisch eingerechnet.",
    },
  ];
}


function getSachsen2027DisplayName(event) {
  if (
    event.category ===
    "state_school_free_day"
  ) {
    return "Unterrichtsfreier Tag (schulfrei)";
  }

  return getHolidayName(event);
}

function getSachsen2027PeriodNote(event) {
  const crossingNote =
    getStateYearCrossingNote(
      event,
      2027,
    );

  if (crossingNote) {
    return crossingNote;
  }

  if (
    event.category ===
      "state_school_free_day" &&
    event.startDate ===
      "2027-05-07"
  ) {
    return (
      "Vom Kultusministerium festgelegter " +
      "unterrichtsfreier Tag: " +
      "Freitag, 7. Mai 2027."
    );
  }

  return "";
}

function findSachsen2027SchoolFreeDay(
  events,
) {
  return events.find((event) => {
    return (
      event.category ===
        "state_school_free_day" &&
      event.startDate ===
        "2027-05-07"
    );
  });
}

function createSachsen2027FaqItems(events) {
  const winter =
    findStateYearGoldEvent(
      events,
      "winter",
      2027,
    );

  const easter =
    findStateYearGoldEvent(
      events,
      "easter",
      2027,
    );

  const pentecost =
    findStateYearGoldEvent(
      events,
      "pentecost",
      2027,
    );

  const summer =
    findStateYearGoldEvent(
      events,
      "summer",
      2027,
    );

  const autumn =
    findStateYearGoldEvent(
      events,
      "autumn",
      2027,
    );

  const christmas =
    findStateYearGoldEvent(
      events,
      "christmas",
      2027,
    );

  const schoolFreeDay =
    findSachsen2027SchoolFreeDay(
      events,
    );

  const rangeText = (event) => {
    if (!event) {
      return (
        "Für diesen Zeitraum liegt " +
        "aktuell kein Eintrag vor."
      );
    }

    return (
      `${formatDate(event.startDate)} bis ` +
      `${formatDate(event.endDate)}`
    );
  };

  return [
    {
      question:
        "Wann sind die Winterferien in Sachsen 2027?",
      answer:
        `Die Winterferien in Sachsen 2027 dauern vom ${rangeText(winter)}.`,
    },
    {
      question:
        "Wann sind die Osterferien in Sachsen 2027?",
      answer:
        `Die Osterferien in Sachsen 2027 dauern vom ${rangeText(easter)}.`,
    },
    {
      question:
        "Ist der 7. Mai 2027 in Sachsen schulfrei?",
      answer:
        `Ja. Freitag, der ${schoolFreeDay ? formatDate(schoolFreeDay.startDate) : "07.05.2027"}, ist ein vom Kultusministerium festgelegter unterrichtsfreier Tag. Mit Christi Himmelfahrt und dem Wochenende ergibt sich freie Zeit vom 06.05. bis 09.05.2027.`,
    },
    {
      question:
        "Wann sind die Pfingstferien in Sachsen 2027?",
      answer:
        `Die Pfingstferien in Sachsen 2027 dauern vom ${rangeText(pentecost)}.`,
    },
    {
      question:
        "Wann sind die Sommerferien in Sachsen 2027?",
      answer:
        `Die Sommerferien in Sachsen 2027 dauern vom ${rangeText(summer)}.`,
    },
    {
      question:
        "Wann sind die Herbstferien in Sachsen 2027?",
      answer:
        `Die Herbstferien in Sachsen 2027 dauern vom ${rangeText(autumn)}.`,
    },
    {
      question:
        "Wann sind die Weihnachtsferien in Sachsen 2027?",
      answer:
        `Die Weihnachtsferien beginnen am ${christmas ? formatDate(christmas.startDate) : "nicht angegeben"} und enden am ${christmas ? formatDate(christmas.endDate) : "nicht angegeben"}.`,
    },
    {
      question:
        "Wann ist der frei bewegliche Ferientag in Sachsen 2027?",
      answer:
        "Für das Schuljahr 2026/27 gibt es einen frei beweglichen Ferientag. Den konkreten Termin kann jede Schule in Abstimmung mit der Schulverwaltung selbst festlegen. Deshalb wird er in der landesweiten Standardübersicht nicht automatisch eingerechnet.",
    },
    {
      question:
        "Ist Fronleichnam 2027 überall in Sachsen ein Feiertag?",
      answer:
        "Nein. Fronleichnam ist in Sachsen nur in bestimmten Regionen gesetzlicher Feiertag und wird deshalb nicht als landesweit freier Tag in die Standardberechnung einbezogen. Der Buß- und Bettag gilt dagegen landesweit in Sachsen.",
    },
    {
      question:
        "Wie berechnet Schulferienklar die zusammenhängende freie Zeit?",
      answer:
        "Schulferienklar erweitert einen offiziellen Ferienzeitraum oder landesweit unterrichtsfreien Tag nur um direkt angrenzende Samstage, Sonntage und landesweit geltende gesetzliche Feiertage. Frei bewegliche Ferientage und regionale Feiertage werden nicht automatisch eingerechnet.",
    },
  ];
}


function getThueringen2027DisplayName(event) {
  if (
    event.category ===
    "state_school_free_day"
  ) {
    return "Schulfreier Tag";
  }

  return getHolidayName(event);
}

function getThueringen2027PeriodNote(event) {
  const crossingNote =
    getStateYearCrossingNote(
      event,
      2027,
    );

  if (crossingNote) {
    return crossingNote;
  }

  if (
    event.category ===
      "state_school_free_day" &&
    event.startDate ===
      "2027-05-07"
  ) {
    return (
      "Landesweit schulfreier Tag: " +
      "Freitag, 7. Mai 2027."
    );
  }

  return "";
}

function findThueringen2027SchoolFreeDay(
  events,
) {
  return events.find((event) => {
    return (
      event.category ===
        "state_school_free_day" &&
      event.startDate ===
        "2027-05-07"
    );
  });
}

function createThueringen2027FaqItems(events) {
  const winter =
    findStateYearGoldEvent(
      events,
      "winter",
      2027,
    );

  const easter =
    findStateYearGoldEvent(
      events,
      "easter",
      2027,
    );

  const summer =
    findStateYearGoldEvent(
      events,
      "summer",
      2027,
    );

  const autumn =
    findStateYearGoldEvent(
      events,
      "autumn",
      2027,
    );

  const christmas =
    findStateYearGoldEvent(
      events,
      "christmas",
      2027,
    );

  const schoolFreeDay =
    findThueringen2027SchoolFreeDay(
      events,
    );

  const rangeText = (event) => {
    if (!event) {
      return (
        "Für diesen Zeitraum liegt " +
        "aktuell kein Eintrag vor."
      );
    }

    return (
      `${formatDate(event.startDate)} bis ` +
      `${formatDate(event.endDate)}`
    );
  };

  return [
    {
      question:
        "Wann sind die Winterferien in Thüringen 2027?",
      answer:
        `Die Winterferien in Thüringen 2027 dauern vom ${rangeText(winter)}.`,
    },
    {
      question:
        "Wann sind die Osterferien in Thüringen 2027?",
      answer:
        `Die Osterferien in Thüringen 2027 dauern vom ${rangeText(easter)}.`,
    },
    {
      question:
        "Ist der 7. Mai 2027 in Thüringen schulfrei?",
      answer:
        `Ja. Freitag, der ${schoolFreeDay ? formatDate(schoolFreeDay.startDate) : "07.05.2027"}, ist landesweit schulfrei. Mit Christi Himmelfahrt und dem Wochenende ergibt sich freie Zeit vom 06.05. bis 09.05.2027.`,
    },
    {
      question:
        "Wann sind die Sommerferien in Thüringen 2027?",
      answer:
        `Die Sommerferien in Thüringen 2027 dauern vom ${rangeText(summer)}.`,
    },
    {
      question:
        "Wann sind die Herbstferien in Thüringen 2027?",
      answer:
        `Die Herbstferien in Thüringen 2027 dauern vom ${rangeText(autumn)}.`,
    },
    {
      question:
        "Wann sind die Weihnachtsferien in Thüringen 2027?",
      answer:
        `Die Weihnachtsferien beginnen am ${christmas ? formatDate(christmas.startDate) : "nicht angegeben"} und enden am ${christmas ? formatDate(christmas.endDate) : "nicht angegeben"}.`,
    },
    {
      question:
        "Wann sind die Ferientage zur freien Verfügung in Thüringen 2027?",
      answer:
        "Die Verwendung der Ferientage zur freien Verfügung entscheidet die jeweilige Schulkonferenz. Deshalb werden diese schulbezogenen Termine nicht automatisch in die landesweite Standardübersicht eingerechnet.",
    },
    {
      question:
        "Ist der Weltkindertag 2027 in Thüringen ein Feiertag?",
      answer:
        "Ja. Montag, der 20. September 2027, ist in Thüringen ein landesweit geltender gesetzlicher Feiertag.",
    },
    {
      question:
        "Ist Fronleichnam 2027 überall in Thüringen ein Feiertag?",
      answer:
        "Nein. Fronleichnam gilt in Thüringen nur in bestimmten Regionen und wird deshalb nicht als landesweiter Feiertag in die Standardberechnung einbezogen.",
    },
    {
      question:
        "Wie berechnet Schulferienklar die zusammenhängende freie Zeit?",
      answer:
        "Schulferienklar erweitert einen offiziellen Ferienzeitraum oder landesweit schulfreien Tag nur um direkt angrenzende Samstage, Sonntage und landesweit geltende gesetzliche Feiertage. Schulbezogene Ferientage zur freien Verfügung und regionale Feiertage werden nicht automatisch eingerechnet.",
    },
  ];
}


function getSachsenAnhalt2027PeriodNote(event) {
  return getStateYearCrossingNote(
    event,
    2027,
  );
}

function createSachsenAnhalt2027FaqItems(
  events,
) {
  const winter =
    findStateYearGoldEvent(
      events,
      "winter",
      2027,
    );

  const easter =
    findStateYearGoldEvent(
      events,
      "easter",
      2027,
    );

  const pentecost =
    findStateYearGoldEvent(
      events,
      "pentecost",
      2027,
    );

  const summer =
    findStateYearGoldEvent(
      events,
      "summer",
      2027,
    );

  const autumn =
    findStateYearGoldEvent(
      events,
      "autumn",
      2027,
    );

  const christmas =
    findStateYearGoldEvent(
      events,
      "christmas",
      2027,
    );

  const rangeText = (event) => {
    if (!event) {
      return (
        "Für diesen Zeitraum liegt " +
        "aktuell kein Eintrag vor."
      );
    }

    return (
      `${formatDate(event.startDate)} bis ` +
      `${formatDate(event.endDate)}`
    );
  };

  return [
    {
      question:
        "Wann sind die Winterferien in Sachsen-Anhalt 2027?",
      answer:
        `Die Winterferien in Sachsen-Anhalt 2027 dauern vom ${rangeText(winter)}.`,
    },
    {
      question:
        "Wann sind die Osterferien in Sachsen-Anhalt 2027?",
      answer:
        `Die Osterferien in Sachsen-Anhalt 2027 dauern vom ${rangeText(easter)}.`,
    },
    {
      question:
        "Wie lange ist rund um Ostern 2027 am Stück frei?",
      answer:
        "Die offiziellen Osterferien dauern vom 22. bis 27. März 2027. Mit dem Wochenende davor, dem Sonntag nach Ferienende und Ostermontag ergibt sich eine zusammenhängende freie Zeit vom 20. bis 29. März 2027 – insgesamt 10 Kalendertage.",
    },
    {
      question:
        "Wann sind die Pfingstferien in Sachsen-Anhalt 2027?",
      answer:
        `Die Pfingstferien in Sachsen-Anhalt 2027 dauern vom ${rangeText(pentecost)}.`,
    },
    {
      question:
        "Wann sind die Sommerferien in Sachsen-Anhalt 2027?",
      answer:
        `Die Sommerferien in Sachsen-Anhalt 2027 dauern vom ${rangeText(summer)}.`,
    },
    {
      question:
        "Wann sind die Herbstferien in Sachsen-Anhalt 2027?",
      answer:
        `Die Herbstferien in Sachsen-Anhalt 2027 dauern vom ${rangeText(autumn)}.`,
    },
    {
      question:
        "Wann sind die Weihnachtsferien in Sachsen-Anhalt 2027?",
      answer:
        `Die Weihnachtsferien beginnen am ${christmas ? formatDate(christmas.startDate) : "nicht angegeben"} und enden am ${christmas ? formatDate(christmas.endDate) : "nicht angegeben"}.`,
    },
    {
      question:
        "Wann sind die beweglichen Ferientage in Sachsen-Anhalt 2027?",
      answer:
        "Die Ferienregelung weist bewegliche Ferientage nur als Anzahl aus. Da ihre konkreten Termine nicht landesweit festgelegt sind, werden sie nicht automatisch in die landesweite Standardübersicht eingerechnet.",
    },
    {
      question:
        "Ist Heilige Drei Könige 2027 in Sachsen-Anhalt ein Feiertag?",
      answer:
        "Ja. Der 6. Januar 2027 ist in Sachsen-Anhalt ein landesweit geltender gesetzlicher Feiertag. Er verlängert die Weihnachtsferien jedoch nicht zu einem zusammenhängenden Zeitraum, weil der 4. und 5. Januar nicht zum offiziellen Ferienzeitraum gehören.",
    },
    {
      question:
        "Wie berechnet Schulferienklar die zusammenhängende freie Zeit?",
      answer:
        "Schulferienklar erweitert einen offiziellen Ferienzeitraum nur um direkt angrenzende Samstage, Sonntage und landesweit geltende gesetzliche Feiertage. Bewegliche Ferientage ohne landesweit festgelegtes Datum werden nicht automatisch eingerechnet.",
    },
  ];
}


function getHamburg2027PeriodNote(event) {
  const crossingNote =
    getStateYearCrossingNote(
      event,
      2027,
    );

  if (crossingNote) {
    return crossingNote;
  }

  if (
    event.type === "winter" &&
    event.startDate === "2027-01-29"
  ) {
    return (
      "Die offizielle Hamburger Ferienordnung " +
      "führt diesen einzelnen Tag als " +
      "Halbjahrespause."
    );
  }

  if (
    event.type === "pentecost" &&
    event.startDate === "2027-05-07"
  ) {
    return (
      "Die offizielle Ferienordnung bezeichnet " +
      "diesen Zeitraum als Himmelfahrt/Pfingsten."
    );
  }

  return "";
}

function createHamburg2027FaqItems(events) {
  const winter =
    findStateYearGoldEvent(
      events,
      "winter",
      2027,
    );

  const spring =
    findStateYearGoldEvent(
      events,
      "spring",
      2027,
    );

  const pentecost =
    findStateYearGoldEvent(
      events,
      "pentecost",
      2027,
    );

  const summer =
    findStateYearGoldEvent(
      events,
      "summer",
      2027,
    );

  const autumn =
    findStateYearGoldEvent(
      events,
      "autumn",
      2027,
    );

  const christmas =
    findStateYearGoldEvent(
      events,
      "christmas",
      2027,
    );

  const rangeText = (event) => {
    if (!event) {
      return (
        "Für diesen Zeitraum liegt " +
        "aktuell kein Eintrag vor."
      );
    }

    return (
      `${formatDate(event.startDate)} bis ` +
      `${formatDate(event.endDate)}`
    );
  };

  return [
    {
      question:
        "Wann ist die Halbjahrespause in Hamburg 2027?",
      answer:
        `Die Halbjahrespause in Hamburg ist am ${winter ? formatDate(winter.startDate) : "29.01.2027"}. Mit dem anschließenden Wochenende ergeben sich drei freie Kalendertage vom 29. bis 31. Januar 2027.`,
    },
    {
      question:
        "Warum heißt es in Hamburg Halbjahrespause statt Winterferien?",
      answer:
        "Die offizielle Hamburger Ferienordnung verwendet für den einzelnen freien Tag Ende Januar die Bezeichnung Halbjahrespause. Schulferienklar übernimmt diese offizielle Bezeichnung.",
    },
    {
      question:
        "Wann sind die Frühjahrsferien in Hamburg 2027?",
      answer:
        `Die Frühjahrsferien in Hamburg 2027 dauern vom ${rangeText(spring)}.`,
    },
    {
      question:
        "Wann sind Himmelfahrt/Pfingsten in Hamburg 2027?",
      answer:
        `Der offizielle Ferienzeitraum Himmelfahrt/Pfingsten dauert vom ${rangeText(pentecost)}.`,
    },
    {
      question:
        "Wie lange ist rund um Himmelfahrt und Pfingsten 2027 am Stück frei?",
      answer:
        "Mit Christi Himmelfahrt am 6. Mai, dem offiziellen Ferienzeitraum vom 7. bis 14. Mai, dem anschließenden Wochenende und Pfingstmontag ergibt sich eine zusammenhängende freie Zeit vom 6. bis 17. Mai 2027 – insgesamt 12 Kalendertage.",
    },
    {
      question:
        "Wann sind die Sommerferien in Hamburg 2027?",
      answer:
        `Die Sommerferien in Hamburg 2027 dauern vom ${rangeText(summer)}.`,
    },
    {
      question:
        "Wann sind die Herbstferien in Hamburg 2027?",
      answer:
        `Die Herbstferien in Hamburg 2027 dauern vom ${rangeText(autumn)}.`,
    },
    {
      question:
        "Wann sind die Weihnachtsferien in Hamburg 2027?",
      answer:
        `Die Weihnachtsferien beginnen am ${christmas ? formatDate(christmas.startDate) : "nicht angegeben"} und enden am ${christmas ? formatDate(christmas.endDate) : "nicht angegeben"}.`,
    },
    {
      question:
        "Wie berechnet Schulferienklar die zusammenhängende freie Zeit?",
      answer:
        "Schulferienklar erweitert einen offiziellen Ferienzeitraum nur um direkt angrenzende Samstage, Sonntage und landesweit geltende gesetzliche Feiertage.",
    },
  ];
}


function getHessen2027PeriodNote(event) {
  return getStateYearCrossingNote(
    event,
    2027,
  );
}

function createHessen2027FaqItems(events) {
  const easter =
    findStateYearGoldEvent(
      events,
      "easter",
      2027,
    );

  const summer =
    findStateYearGoldEvent(
      events,
      "summer",
      2027,
    );

  const autumn =
    findStateYearGoldEvent(
      events,
      "autumn",
      2027,
    );

  const christmas =
    findStateYearGoldEvent(
      events,
      "christmas",
      2027,
    );

  const rangeText = (event) => {
    if (!event) {
      return (
        "Für diesen Zeitraum liegt " +
        "aktuell kein Eintrag vor."
      );
    }

    return (
      `${formatDate(event.startDate)} bis ` +
      `${formatDate(event.endDate)}`
    );
  };

  return [
    {
      question:
        "Gibt es in Hessen 2027 Winterferien?",
      answer:
        "Nein. Die offizielle hessische Ferienübersicht weist für diese Schuljahre keine einheitlichen Winterferien aus.",
    },
    {
      question:
        "Gibt es in Hessen 2027 Pfingstferien?",
      answer:
        "Nein. In der landesweiten hessischen Ferienübersicht sind für 2027 keine einheitlichen Pfingstferien aufgeführt.",
    },
    {
      question:
        "Wann sind die Osterferien in Hessen 2027?",
      answer:
        `Die Osterferien in Hessen 2027 dauern vom ${rangeText(easter)}.`,
    },
    {
      question:
        "Wie lange ist rund um die Osterferien 2027 am Stück frei?",
      answer:
        "Die offiziellen Osterferien dauern vom 22. März bis 2. April 2027. Mit den direkt angrenzenden Wochenenden ergibt sich eine zusammenhängende freie Zeit vom 20. März bis 4. April 2027 – insgesamt 16 Kalendertage.",
    },
    {
      question:
        "Wann sind die Sommerferien in Hessen 2027?",
      answer:
        `Die Sommerferien in Hessen 2027 dauern vom ${rangeText(summer)}.`,
    },
    {
      question:
        "Wann sind die Herbstferien in Hessen 2027?",
      answer:
        `Die Herbstferien in Hessen 2027 dauern vom ${rangeText(autumn)}.`,
    },
    {
      question:
        "Wie lange ist rund um die Herbstferien 2027 am Stück frei?",
      answer:
        "Die Herbstferien beginnen am 4. Oktober 2027. Da der Tag der Deutschen Einheit am 3. Oktober direkt davor liegt und auf einen Sonntag fällt, ergibt sich zusammen mit den angrenzenden Wochenenden eine freie Zeit vom 2. bis 17. Oktober 2027 – insgesamt 16 Kalendertage.",
    },
    {
      question:
        "Wann sind die Weihnachtsferien in Hessen 2027?",
      answer:
        `Die Weihnachtsferien beginnen am ${christmas ? formatDate(christmas.startDate) : "nicht angegeben"} und enden am ${christmas ? formatDate(christmas.endDate) : "nicht angegeben"}.`,
    },
    {
      question:
        "Wann sind die beweglichen Ferientage in Hessen 2027?",
      answer:
        "Die offizielle Übersicht nennt bewegliche Ferientage nur als Anzahl. Da ihre konkreten Termine nicht landesweit einheitlich festgelegt sind, werden sie nicht automatisch in die landesweite Standardübersicht eingerechnet.",
    },
    {
      question:
        "Wie berechnet Schulferienklar die zusammenhängende freie Zeit?",
      answer:
        "Schulferienklar erweitert einen offiziellen Ferienzeitraum nur um direkt angrenzende Samstage, Sonntage und landesweit geltende gesetzliche Feiertage. Bewegliche Ferientage ohne landesweit festgelegtes Datum werden nicht automatisch eingerechnet.",
    },
  ];
}


function getRheinlandPfalz2027PeriodNote(event) {
  return getStateYearCrossingNote(
    event,
    2027,
  );
}

function createRheinlandPfalz2027FaqItems(
  events,
) {
  const easter =
    findStateYearGoldEvent(
      events,
      "easter",
      2027,
    );

  const summer =
    findStateYearGoldEvent(
      events,
      "summer",
      2027,
    );

  const autumn =
    findStateYearGoldEvent(
      events,
      "autumn",
      2027,
    );

  const christmas =
    findStateYearGoldEvent(
      events,
      "christmas",
      2027,
    );

  const rangeText = (event) => {
    if (!event) {
      return (
        "Für diesen Zeitraum liegt " +
        "aktuell kein Eintrag vor."
      );
    }

    return (
      `${formatDate(event.startDate)} bis ` +
      `${formatDate(event.endDate)}`
    );
  };

  return [
    {
      question:
        "Gibt es in Rheinland-Pfalz 2027 Winterferien?",
      answer:
        "Nein. Die offizielle Ferienübersicht für Rheinland-Pfalz weist für diese Schuljahre keine landesweit einheitlichen Winterferien aus.",
    },
    {
      question:
        "Gibt es in Rheinland-Pfalz 2027 Pfingstferien?",
      answer:
        "Nein. In der offiziellen landesweiten Ferienübersicht sind für 2027 keine Pfingstferien ausgewiesen.",
    },
    {
      question:
        "Wann sind die Osterferien in Rheinland-Pfalz 2027?",
      answer:
        `Die Osterferien in Rheinland-Pfalz 2027 dauern vom ${rangeText(easter)}.`,
    },
    {
      question:
        "Wie lange ist rund um Ostern 2027 am Stück frei?",
      answer:
        "Die offiziellen Osterferien dauern vom 22. März bis 2. April 2027. Mit den direkt angrenzenden Wochenenden ergibt sich eine zusammenhängende freie Zeit vom 20. März bis 4. April 2027 – insgesamt 16 Kalendertage.",
    },
    {
      question:
        "Wann sind die Sommerferien in Rheinland-Pfalz 2027?",
      answer:
        `Die Sommerferien in Rheinland-Pfalz 2027 dauern vom ${rangeText(summer)}.`,
    },
    {
      question:
        "Wann sind die Herbstferien in Rheinland-Pfalz 2027?",
      answer:
        `Die Herbstferien in Rheinland-Pfalz 2027 dauern vom ${rangeText(autumn)}.`,
    },
    {
      question:
        "Wie lange ist rund um die Herbstferien 2027 am Stück frei?",
      answer:
        "Die Herbstferien beginnen am 4. Oktober 2027. Mit dem Wochenende und dem Tag der Deutschen Einheit unmittelbar davor sowie dem Wochenende nach Ferienende ergibt sich eine zusammenhängende freie Zeit vom 2. bis 17. Oktober 2027 – insgesamt 16 Kalendertage.",
    },
    {
      question:
        "Wann sind die Weihnachtsferien in Rheinland-Pfalz 2027?",
      answer:
        `Die Weihnachtsferien beginnen am ${christmas ? formatDate(christmas.startDate) : "nicht angegeben"} und enden am ${christmas ? formatDate(christmas.endDate) : "nicht angegeben"}.`,
    },
    {
      question:
        "Wann sind die beweglichen Ferientage in Rheinland-Pfalz 2027?",
      answer:
        "Jede Schule kann pro Schuljahr zusätzlich über sechs bewegliche Ferientage verfügen. Die konkreten Termine legt die jeweilige Schule fest. Deshalb werden sie nicht automatisch in die landesweite Standardübersicht eingerechnet.",
    },
    {
      question:
        "Wie berechnet Schulferienklar die zusammenhängende freie Zeit?",
      answer:
        "Schulferienklar erweitert einen offiziellen Ferienzeitraum nur um direkt angrenzende Samstage, Sonntage und landesweit geltende gesetzliche Feiertage. Bewegliche Ferientage ohne landesweit festgelegtes Datum werden nicht automatisch eingerechnet.",
    },
  ];
}


function getBrandenburg2027PeriodNote(event) {
  return getStateYearCrossingNote(
    event,
    2027,
  );
}

function createBrandenburg2027FaqItems(
  events,
) {
  const winter =
    findStateYearGoldEvent(
      events,
      "winter",
      2027,
    );

  const easter =
    findStateYearGoldEvent(
      events,
      "easter",
      2027,
    );

  const pentecost =
    findStateYearGoldEvent(
      events,
      "pentecost",
      2027,
    );

  const summer =
    findStateYearGoldEvent(
      events,
      "summer",
      2027,
    );

  const autumn =
    findStateYearGoldEvent(
      events,
      "autumn",
      2027,
    );

  const christmas =
    findStateYearGoldEvent(
      events,
      "christmas",
      2027,
    );

  const rangeText = (event) => {
    if (!event) {
      return (
        "Für diesen Zeitraum liegt " +
        "aktuell kein Eintrag vor."
      );
    }

    if (event.startDate === event.endDate) {
      return formatDate(event.startDate);
    }

    return (
      `${formatDate(event.startDate)} bis ` +
      `${formatDate(event.endDate)}`
    );
  };

  return [
    {
      question:
        "Wann sind die Winterferien in Brandenburg 2027?",
      answer:
        `Die Winterferien in Brandenburg 2027 dauern vom ${rangeText(winter)}.`,
    },
    {
      question:
        "Wann sind die Osterferien in Brandenburg 2027?",
      answer:
        `Die Osterferien in Brandenburg 2027 dauern vom ${rangeText(easter)}.`,
    },
    {
      question:
        "Wann ist Pfingsten in Brandenburg 2027 schulfrei?",
      answer:
        `Der offizielle Ferientag zu Pfingsten ist ${rangeText(pentecost)}.`,
    },
    {
      question:
        "Wie lange ist rund um Pfingsten 2027 am Stück frei?",
      answer:
        "Der offizielle Ferientag ist Dienstag, der 18. Mai 2027. Zusammen mit dem direkt davorliegenden Wochenende, Pfingstsonntag und Pfingstmontag ergibt sich eine zusammenhängende freie Zeit vom 15. bis 18. Mai 2027 – insgesamt 4 Kalendertage.",
    },
    {
      question:
        "Wann sind die Sommerferien in Brandenburg 2027?",
      answer:
        `Die Sommerferien in Brandenburg 2027 dauern vom ${rangeText(summer)}.`,
    },
    {
      question:
        "Wann sind die Herbstferien in Brandenburg 2027?",
      answer:
        `Die Herbstferien in Brandenburg 2027 dauern vom ${rangeText(autumn)}.`,
    },
    {
      question:
        "Wann sind die Weihnachtsferien in Brandenburg 2027?",
      answer:
        `Die Weihnachtsferien beginnen am ${christmas ? formatDate(christmas.startDate) : "nicht angegeben"} und enden am ${christmas ? formatDate(christmas.endDate) : "nicht angegeben"}.`,
    },
    {
      question:
        "Ist der 7. Mai 2027 in Brandenburg ein variabler Ferientag?",
      answer:
        "Die offizielle Anlage 1 der VV Schulbetrieb führt Freitag, den 7. Mai 2027, als variablen Ferientag für das Schuljahr 2026/27 auf.",
    },
    {
      question:
        "Gilt der variable Ferientag am 7. Mai 2027 für jede Schule?",
      answer:
        "Nicht zwingend. Die Schulkonferenz kann nach den brandenburgischen Regelungen eine abweichende Festlegung treffen. Deshalb wird der variable Ferientag nicht automatisch in die landesweite Standardübersicht eingerechnet.",
    },
    {
      question:
        "Wie berechnet Schulferienklar die zusammenhängende freie Zeit?",
      answer:
        "Schulferienklar erweitert einen offiziellen landesweiten Ferienzeitraum nur um direkt angrenzende Samstage, Sonntage und landesweit geltende gesetzliche Feiertage. Variable Ferientage, die von einer Schulkonferenz abweichend festgelegt werden können, werden nicht automatisch eingerechnet.",
    },
  ];
}

function subscriptionCtaHtml({ code, name }) {
  const normalizedCode = String(code).toLowerCase();
  const httpsUrl =
    `https://www.schulferienklar.de/calendar/${normalizedCode}.ics`;
  const webcalUrl =
    `webcal://www.schulferienklar.de/calendar/${normalizedCode}.ics`;

  return `        <div class="seo-subscription-cta">
          <a
            class="seo-subscription-link"
            href="${webcalUrl}"
            aria-label="Kalender ${escapeHtml(name)} abonnieren"
            data-download-action="subscribe-calendar-${normalizedCode}"
          >
            Kalender abonnieren
          </a>
          <span>2026–2030 · automatisch aktualisiert</span>
          <details class="seo-subscription-help">
            <summary>Google-Hilfe</summary>
            <p>
              Unter „Weitere Kalender → Per URL“ einfügen:
              <code>${httpsUrl}</code>
            </p>
          </details>
        </div>`;
}


function jahreskalenderHtml({
  slug,
  name,
  code,
  year,
}) {
  const calendarCode =
    String(code).toLowerCase();

  const htmlUrl =
    `/downloads/jahreskalender-${slug}-${year}.html`;

  const pdfUrl =
    `/downloads/schulferien-${slug}-${year}.pdf`;

  const icsUrl =
    `/downloads/schulferien-${slug}-${year}.ics`;

  return `        <section
          id="jahreskalender"
          class="gold-section gold-jahreskalender"
        >
          <p class="eyebrow">
            Zwölf Monate auf einer Seite
          </p>
          <h2>
            Jahreskalender ${escapeHtml(name)} ${year}
          </h2>
          <p>
            Öffne die vollständige Jahresansicht mit
            Kalenderwochen, Schulferien, Feiertagen und
            direkt zusammenhängender freier Zeit.
          </p>

          <div class="gold-jahreskalender-grid">
            <a
              class="gold-jahreskalender-card gold-jahreskalender-primary"
              href="${htmlUrl}"
              data-download-action="open-jahreskalender-${slug}-${year}"
            >
              <span>Jahresansicht</span>
              <strong>Jahreskalender öffnen</strong>
              <small>
                Alle zwölf Monate direkt im Browser ansehen.
              </small>
            </a>

            <a
              class="gold-jahreskalender-card"
              href="${pdfUrl}"
              download
              data-download-action="download-pdf-${slug}-${year}"
            >
              <span>PDF · A4 Querformat</span>
              <strong>PDF herunterladen</strong>
              <small>
                Druckfertige Jahresübersicht auf einer Seite.
              </small>
            </a>

            <a
              class="gold-jahreskalender-card"
              href="${icsUrl}"
              download
              data-download-action="download-ics-${slug}-${year}"
            >
              <span>ICS · ${year}</span>
              <strong>ICS-Datei herunterladen</strong>
              <small>
                Einmaliger Import der Termine für ${year}.
              </small>
            </a>
          </div>

${subscriptionCtaHtml({
  code: calendarCode,
  name,
})}

          <p class="gold-jahreskalender-note">
            Das Kalender-Abo enthält die Jahre 2026–2030
            und wird automatisch aktualisiert. PDF und
            ICS-Datei gelten nur für ${year}.
          </p>
        </section>`;
}

function bayern2027RelatedLinksHtml() {
  return `        <section class="gold-section">
          <h2>Passende Ferienübersichten</h2>
          <ul class="holiday-summary-list seo-link-list gold-related-links">
            <li><a href="/schulferien-bayern-2026.html">Schulferien Bayern 2026</a></li>
            <li><a href="/schulferien-bayern-2028.html">Schulferien Bayern 2028</a></li>
            <li><a href="/schulferien-bayern.html">Alle Jahre für Bayern</a></li>
            <li><a href="/schulferien-2027.html">Alle Bundesländer 2027</a></li>
            <li><a href="/schulferien-baden-wuerttemberg-2027.html">Baden-Württemberg 2027</a></li>
            <li><a href="/schulferien-hessen-2027.html">Hessen 2027</a></li>
            <li><a href="/schulferien-sachsen-2027.html">Sachsen 2027</a></li>
            <li><a href="/schulferien-thueringen-2027.html">Thüringen 2027</a></li>
          </ul>
        </section>`;
}

function bayern2027GoldPageTemplate({
  slug,
  name,
  code,
  year,
  events,
}) {
  const title = "Schulferien Bayern 2027: Termine und freie Zeit";
  const description =
    "Schulferien Bayern 2027 mit allen Terminen: Frühjahrs-, Oster-, Pfingst-, Sommer- und Weihnachtsferien, freie Zeit inklusive Wochenenden und Quelle.";
  const publicHolidays = getPublicHolidaysAroundYear({
    publicHolidayIndex,
    code,
    year,
  });
  const source = getSchoolHolidaySourceForState({
    holidayIndex,
    code,
  });
  const faqItems = createBayern2027FaqItems(events);

  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="https://www.schulferienklar.de/schulferien-${slug}-${year}.html" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="https://www.schulferienklar.de/schulferien-${slug}-${year}.html" />
    <meta property="og:image" content="https://www.schulferienklar.de/og-image.png" />
    ${sharedSeoStyles()}
${bayern2027StructuredDataHtml(faqItems)}
  </head>
  <body class="seo-page">
    <main>
${seoTopNavHtml({ appHref: `/?state=${code}&year=${year}` })}      <section class="card gold-page" data-gold-page="bayern-2027">
        <p class="eyebrow">Bayern · Kalenderjahr 2027</p>
        <h1>Schulferien Bayern 2027</h1>

        <p class="gold-page-intro">
          Hier stehen zuerst die offiziellen Ferientermine. Zusätzlich zeigt
          Schulferienklar, wie lange die freie Zeit direkt am Stück dauert,
          wenn unmittelbar angrenzende Wochenenden oder landesweite Feiertage
          anschließen.
        </p>

${schulferienklarIntroCardHtml({
  appHref: `/?state=${code}&year=${year}`,
})}

        <nav class="gold-page-nav" aria-label="Inhalt dieser Seite">
          <a href="#termine">Alle Termine</a>
          <a href="#berechnung">Freie Zeit</a>
          <a href="#jahreskalender">Jahreskalender</a>
          <a href="#widget">Widget</a>
          <a href="#bezeichnungen">Bezeichnungen</a>
          <a href="#quelle">Quelle</a>
          <a href="#fragen">Fragen</a>
        </nav>

        <section id="termine" class="gold-section gold-answer-section">
          <p class="eyebrow">Direkte Übersicht</p>
          <h2>Alle Ferienzeiten in Bayern 2027</h2>
          <p>
            Die Liste berücksichtigt auch Weihnachtsferien, die aus dem
            Vorjahr in 2027 hineinreichen oder bis 2028 dauern.
          </p>
          <ul class="gold-period-list">
${bayern2027PeriodRowsHtml(events, publicHolidays)}
          </ul>
        </section>

        <section id="berechnung" class="gold-section">
          <p class="eyebrow">Planung statt bloßer Datumsliste</p>
          <h2>Was „zusammenhängend frei“ bedeutet</h2>
          <div class="gold-explanation-grid">
            <div>
              <strong>Offizieller Zeitraum</strong>
              <p>
                Exakt der im bayerischen Ferien-Datensatz veröffentlichte
                Beginn und das veröffentlichte Ende.
              </p>
            </div>
            <div>
              <strong>Zusammenhängend frei</strong>
              <p>
                Der offizielle Zeitraum plus direkt anschließende Samstage,
                Sonntage und landesweit geltende gesetzliche Feiertage.
              </p>
            </div>
          </div>
          <p class="gold-calculation-note">
            Angegeben werden Kalendertage, nicht die Zahl der ausgefallenen
            Unterrichtstage. Regionale und lokale Feiertage werden für diese
            Standardberechnung nicht berücksichtigt.
          </p>
        </section>

${jahreskalenderHtml({ slug, name, code, year })}
${widgetPromoHtml({ code, name })}

        <section id="bezeichnungen" class="gold-section">
          <p class="eyebrow">Bayerische Besonderheiten</p>
          <h2>Faschingsferien und Herbstferien: die offiziellen Namen</h2>
          <div class="gold-terminology-grid">
            <div>
              <h3>Faschingsferien</h3>
              <p>
                Viele Familien suchen nach „Faschingsferien Bayern 2027“.
                In der offiziellen Ferienordnung heißen diese Tage
                <strong>Frühjahrsferien</strong>.
              </p>
            </div>
            <div>
              <h3>Herbstferien</h3>
              <p>
                Bayern verwendet für den Zeitraum im November die Bezeichnung
                <strong>unterrichtsfreie Tage um Allerheiligen</strong>.
              </p>
            </div>
          </div>
        </section>

${bayern2027SourceHtml(source)}
${bayern2027FaqHtml(faqItems)}
${bayern2027RelatedLinksHtml()}

        <a class="button" href="/?state=${code}&year=${year}">
          Bayern 2027 im Kalender öffnen
        </a>
      </section>
${seoFooterHtml()}    </main>
  </body>
</html>`;
}


function nrw2027SpecialSectionHtml() {
  return `        <section id="besonderheiten" class="gold-section">
          <p class="eyebrow">Wichtig für NRW</p>
          <h2>Bewegliche Ferientage und Pfingsten 2027</h2>
          <div class="gold-terminology-grid">
            <div>
              <h3>Bewegliche Ferientage</h3>
              <p>
                Zusätzlich zu den landesweit einheitlichen Ferien
                gibt es in den Schuljahren 2026/27 und 2027/28
                jeweils <strong>drei bewegliche Ferientage</strong>.
                Die konkreten Termine legt die Schulkonferenz im
                Einvernehmen mit dem Schulträger fest.
              </p>
              <p>
                Rosenmontag oder andere örtliche Brauchtumstage
                können deshalb je nach Schule frei sein, sind aber
                keine landesweit einheitlichen Ferientermine.
              </p>
            </div>
            <div>
              <h3>Pfingsten 2027</h3>
              <p>
                Die offizielle Ferienordnung nennt
                <strong>Dienstag, den 18. Mai 2027</strong>,
                als Ferientag zu Pfingsten.
              </p>
              <p>
                Die Tabelle oben zeigt zusätzlich, wie sich dieser
                einzelne Ferientag direkt mit Wochenende und
                Pfingstmontag zu zusammenhängender freier Zeit
                verbindet.
              </p>
            </div>
          </div>
        </section>`;
}

function nrw2027RelatedLinksHtml() {
  return stateYearGoldRelatedLinksHtml([
    {
      href:
        "/schulferien-nordrhein-westfalen-2026.html",
      label:
        "Schulferien Nordrhein-Westfalen 2026",
    },
    {
      href:
        "/schulferien-nordrhein-westfalen-2028.html",
      label:
        "Schulferien Nordrhein-Westfalen 2028",
    },
    {
      href:
        "/schulferien-nordrhein-westfalen.html",
      label:
        "Alle Jahre für Nordrhein-Westfalen",
    },
    {
      href:
        "/schulferien-2027.html",
      label:
        "Alle Bundesländer 2027",
    },
    {
      href:
        "/schulferien-niedersachsen-2027.html",
      label:
        "Niedersachsen 2027",
    },
    {
      href:
        "/schulferien-hessen-2027.html",
      label:
        "Hessen 2027",
    },
    {
      href:
        "/schulferien-rheinland-pfalz-2027.html",
      label:
        "Rheinland-Pfalz 2027",
    },
    {
      href:
        "/schulferien-bayern-2027.html",
      label:
        "Bayern 2027",
    },
  ]);
}

function indentGoldText(
  text,
  spaces,
) {
  const prefix =
    " ".repeat(spaces);

  return String(text)
    .split("\n")
    .map((line) => {
      return `${prefix}${line}`;
    })
    .join("\n");
}

function stateYearGoldPageTemplate({
  slug,
  name,
  code,
  year,
  events,
  title,
  description,
  marker,
  eyebrow,
  h1,
  introText,
  specialNavLabel,
  termHeadingText,
  termIntroText,
  renderPeriodRows,
  officialPeriodText,
  connectedPeriodText,
  calculationNoteText,
  specialSectionHtml,
  sourceLinkLabel,
  secondaryLinkLabel,
  faqItems,
  relatedLinksHtml,
  buttonText,
}) {
  const publicHolidays =
    getPublicHolidaysAroundYear({
      publicHolidayIndex,
      code,
      year,
    });

  const source =
    getSchoolHolidaySourceForState({
      holidayIndex,
      code,
    });

  const periodRowsHtml =
    renderPeriodRows({
      events,
      publicHolidays,
      year,
    });

  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="https://www.schulferienklar.de/schulferien-${slug}-${year}.html" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="https://www.schulferienklar.de/schulferien-${slug}-${year}.html" />
    <meta property="og:image" content="https://www.schulferienklar.de/og-image.png" />
    ${sharedSeoStyles()}
${stateYearGoldStructuredDataHtml({
  faqItems,
  slug,
  name,
  year,
})}
  </head>
  <body class="seo-page">
    <main>
${seoTopNavHtml({
  appHref:
    `/?state=${code}&year=${year}`,
})}      <section
        class="card gold-page"
        data-gold-page="${marker}"
      >
        <p class="eyebrow">
          ${eyebrow}
        </p>
        <h1>${h1}</h1>

        <p class="gold-page-intro">
${indentGoldText(
  introText,
  10,
)}
        </p>

${schulferienklarIntroCardHtml({
  appHref:
    `/?state=${code}&year=${year}`,
})}

        <nav
          class="gold-page-nav"
          aria-label="Inhalt dieser Seite"
        >
          <a href="#termine">Alle Termine</a>
          <a href="#berechnung">Freie Zeit</a>
          <a href="#jahreskalender">Jahreskalender</a>
          <a href="#widget">Widget</a>
          <a href="#besonderheiten">${specialNavLabel}</a>
          <a href="#quelle">Quelle</a>
          <a href="#fragen">Fragen</a>
        </nav>

        <section
          id="termine"
          class="gold-section gold-answer-section"
        >
          <p class="eyebrow">
            Direkte Übersicht
          </p>
          <h2>
${indentGoldText(
  termHeadingText,
  12,
)}
          </h2>
          <p>
${indentGoldText(
  termIntroText,
  12,
)}
          </p>
          <ul class="gold-period-list">
${periodRowsHtml}
          </ul>
        </section>

        <section
          id="berechnung"
          class="gold-section"
        >
          <p class="eyebrow">
            Planung statt bloßer Datumsliste
          </p>
          <h2>
            Was „zusammenhängend frei“ bedeutet
          </h2>
          <div class="gold-explanation-grid">
            <div>
              <strong>
                Offizieller Zeitraum
              </strong>
              <p>
${indentGoldText(
  officialPeriodText,
  16,
)}
              </p>
            </div>
            <div>
              <strong>
                Zusammenhängend frei
              </strong>
              <p>
${indentGoldText(
  connectedPeriodText,
  16,
)}
              </p>
            </div>
          </div>
          <p class="gold-calculation-note">
${indentGoldText(
  calculationNoteText,
  12,
)}
          </p>
        </section>

${jahreskalenderHtml({
  slug,
  name,
  code,
  year,
})}
${widgetPromoHtml({
  code,
  name,
})}

${specialSectionHtml}

${stateYearGoldSourceHtml({
  source,
  name,
  sourceLinkLabel,
  secondaryLinkLabel,
})}

${stateYearGoldFaqHtml({
  faqItems,
  name,
  year,
})}

${relatedLinksHtml}

        <a
          class="button"
          href="/?state=${code}&year=${year}"
        >
          ${buttonText}
        </a>
      </section>
${seoFooterHtml()}    </main>
  </body>
</html>`;
}

function nrw2027GoldPageTemplate({
  slug,
  name,
  code,
  year,
  events,
}) {
  const faqItems =
    createNrw2027FaqItems(
      events,
    );

  return stateYearGoldPageTemplate({
    slug,
    name,
    code,
    year,
    events,
    title:
      "Schulferien NRW 2027: Termine & bewegliche Ferientage",
    description:
      "Schulferien NRW 2027 mit allen Terminen, Pfingsten, beweglichen Ferientagen, zusammenhängender freier Zeit, Jahreskalender, PDF und offizieller Quelle.",
    marker:
      "nrw-2027",
    eyebrow:
      "Nordrhein-Westfalen · Kalenderjahr 2027",
    h1:
      "Schulferien Nordrhein-Westfalen 2027",
    introText:
      `Hier stehen zuerst die landesweit einheitlichen
Ferientermine. Zusätzlich zeigt Schulferienklar,
wie lange die freie Zeit direkt am Stück dauert,
wenn unmittelbar angrenzende Wochenenden oder
landesweite Feiertage anschließen.`,
    specialNavLabel:
      "NRW-Hinweise",
    termHeadingText:
      "Alle Ferienzeiten in Nordrhein-Westfalen 2027",
    termIntroText:
      `Die Liste berücksichtigt auch Weihnachtsferien,
die aus 2026 in das Kalenderjahr 2027 hineinreichen
oder bis 2028 dauern.`,
    renderPeriodRows:
      ({
        events,
        publicHolidays,
        year,
      }) => {
        return stateYearGoldPeriodRowsHtml({
          events,
          publicHolidays,
          year,
          getDisplayName:
            getNrw2027DisplayName,
          getPeriodNote:
            getNrw2027PeriodNote,
        });
      },
    officialPeriodText:
      `Exakt der im NRW-Feriendatensatz
veröffentlichte Beginn und das
veröffentlichte Ende.`,
    connectedPeriodText:
      `Der offizielle Zeitraum plus direkt
anschließende Samstage, Sonntage und
landesweit geltende gesetzliche Feiertage.`,
    calculationNoteText:
      `Angegeben werden Kalendertage, nicht die Zahl
der ausgefallenen Unterrichtstage. Bewegliche
Ferientage werden nicht eingerechnet, weil ihre
Termine von der jeweiligen Schule abhängen.`,
    specialSectionHtml:
      nrw2027SpecialSectionHtml(),
    sourceLinkLabel:
      "Ferienordnung des Schulministeriums",
    secondaryLinkLabel:
      "Weitere Ferieninformationen für NRW",
    faqItems,
    relatedLinksHtml:
      nrw2027RelatedLinksHtml(),
    buttonText:
      "Nordrhein-Westfalen 2027 im Kalender öffnen",
  });
}










function brandenburg2027SpecialSectionHtml() {
  return `        <section
          id="besonderheiten"
          class="gold-section"
        >
          <p class="eyebrow">
            Wichtig für Brandenburg
          </p>
          <h2>
            Variabler Ferientag und Pfingsten 2027
          </h2>

          <div class="gold-terminology-grid">
            <div>
              <h3>Variabler Ferientag am 7. Mai</h3>
              <p>
                Die offizielle Anlage 1 der
                VV Schulbetrieb führt für das
                Schuljahr 2026/27
                <strong>Freitag, den 7. Mai
                2027</strong>, als variablen
                Ferientag auf.
              </p>
              <p>
                Eine Schulkonferenz kann jedoch
                eine abweichende Festlegung
                treffen. Deshalb wird dieser Tag
                nicht automatisch in die
                landesweite Standardübersicht
                eingerechnet.
              </p>
            </div>

            <div>
              <h3>Vier freie Tage rund um Pfingsten</h3>
              <p>
                Der offizielle schulfreie Tag
                zu Pfingsten ist
                <strong>Dienstag, der
                18. Mai 2027</strong>.
              </p>
              <p>
                Mit dem Wochenende,
                Pfingstsonntag und Pfingstmontag
                unmittelbar davor ergibt sich
                eine freie Zeit vom
                <strong>15. bis 18. Mai 2027 –
                insgesamt 4 Kalendertage</strong>.
              </p>
            </div>
          </div>

          <p class="gold-source-note">
            <strong>Wichtig:</strong>
            Variable Ferientage können in
            Brandenburg auf Beschluss der
            Schulkonferenz anders festgelegt
            werden. Für die konkrete Schule ist
            deshalb deren eigene Veröffentlichung
            maßgeblich.
          </p>
        </section>`;
}

function brandenburg2027RelatedLinksHtml() {
  return stateYearGoldRelatedLinksHtml([
    {
      href:
        "/schulferien-brandenburg-2026.html",
      label:
        "Schulferien Brandenburg 2026",
    },
    {
      href:
        "/schulferien-brandenburg-2028.html",
      label:
        "Schulferien Brandenburg 2028",
    },
    {
      href:
        "/schulferien-brandenburg.html",
      label:
        "Alle Jahre für Brandenburg",
    },
    {
      href:
        "/schulferien-2027.html",
      label:
        "Alle Bundesländer 2027",
    },
    {
      href:
        "/schulferien-berlin-2027.html",
      label:
        "Berlin 2027",
    },
    {
      href:
        "/schulferien-sachsen-anhalt-2027.html",
      label:
        "Sachsen-Anhalt 2027",
    },
    {
      href:
        "/schulferien-sachsen-2027.html",
      label:
        "Sachsen 2027",
    },
    {
      href:
        "/schulferien-mecklenburg-vorpommern-2027.html",
      label:
        "Mecklenburg-Vorpommern 2027",
    },
  ]);
}

function brandenburg2027GoldPageTemplate({
  slug,
  name,
  code,
  year,
  events,
}) {
  const faqItems =
    createBrandenburg2027FaqItems(
      events,
    );

  return stateYearGoldPageTemplate({
    slug,
    name,
    code,
    year,
    events,
    title:
      "Schulferien Brandenburg 2027: Termine und freie Tage",
    description:
      "Schulferien Brandenburg 2027 mit Winterferien, Osterferien, Pfingsten, Sommerferien, Herbstferien, Weihnachtsferien, variablem Ferientag, PDF, ICS und offizieller Quelle.",
    marker:
      "brandenburg-2027",
    eyebrow:
      "Brandenburg · Kalenderjahr 2027",
    h1:
      "Schulferien Brandenburg 2027",
    introText:
      `Hier stehen zuerst die landesweit festgelegten
Ferientermine für Brandenburg. Zusätzlich zeigt
Schulferienklar, wie lange die freie Zeit direkt am
Stück dauert, wenn Wochenenden oder landesweite
Feiertage unmittelbar anschließen.`,
    specialNavLabel:
      "Brandenburg-Hinweise",
    termHeadingText:
      "Alle Ferienzeiten in Brandenburg 2027",
    termIntroText:
      `Die landesweite Übersicht enthält
Weihnachtsferien, Winterferien, Osterferien,
Pfingsten, Sommerferien und Herbstferien.
Variable Ferientage werden getrennt behandelt,
weil Schulen abweichende Festlegungen treffen
können.`,
    renderPeriodRows:
      ({
        events,
        publicHolidays,
        year,
      }) => {
        return stateYearGoldPeriodRowsHtml({
          events,
          publicHolidays,
          year,
          getPeriodNote:
            getBrandenburg2027PeriodNote,
        });
      },
    officialPeriodText:
      `Exakt der in Anlage 1 der VV Schulbetrieb
veröffentlichte Beginn und das veröffentlichte Ende
des jeweiligen landesweiten Ferienzeitraums.`,
    connectedPeriodText:
      `Der offizielle Zeitraum plus direkt
anschließende Samstage, Sonntage und
landesweit geltende gesetzliche Feiertage.`,
    calculationNoteText:
      `Angegeben werden Kalendertage, nicht die Zahl
der ausgefallenen Unterrichtstage. Variable
Ferientage, die auf Schulebene abweichend
festgelegt werden können, werden nicht automatisch
eingerechnet.`,
    specialSectionHtml:
      brandenburg2027SpecialSectionHtml(),
    sourceLinkLabel:
      "Anlage 1 der VV Schulbetrieb",
    secondaryLinkLabel:
      "Schulferien Brandenburg beim MBJS",
    faqItems,
    relatedLinksHtml:
      brandenburg2027RelatedLinksHtml(),
    buttonText:
      "Brandenburg 2027 im Kalender öffnen",
  });
}

function rheinlandPfalz2027SpecialSectionHtml() {
  return `        <section
          id="besonderheiten"
          class="gold-section"
        >
          <p class="eyebrow">
            Wichtig für Rheinland-Pfalz
          </p>
          <h2>
            Winterferien, Pfingstferien und bewegliche Ferientage 2027
          </h2>

          <div class="gold-terminology-grid">
            <div>
              <h3>Keine Winter- oder Pfingstferien</h3>
              <p>
                Die offizielle Ferienübersicht für
                Rheinland-Pfalz weist 2027
                <strong>keine landesweit
                einheitlichen Winterferien oder
                Pfingstferien</strong> aus.
              </p>
              <p>
                Deshalb erscheinen diese Zeiträume
                nicht als Ferienblöcke in der
                landesweiten Standardübersicht.
              </p>
            </div>

            <div>
              <h3>Bewegliche Ferientage</h3>
              <p>
                Jede Schule kann pro Schuljahr
                zusätzlich über
                <strong>sechs bewegliche
                Ferientage</strong> verfügen.
              </p>
              <p>
                Die konkreten Termine legt die
                jeweilige Schule fest. Deshalb
                werden sie hier nicht automatisch
                eingerechnet.
              </p>
            </div>
          </div>

          <p class="gold-source-note">
            <strong>Herbst 2027:</strong>
            Die Herbstferien beginnen am
            4. Oktober. Mit dem Wochenende und dem
            Tag der Deutschen Einheit unmittelbar
            davor sowie dem Wochenende nach
            Ferienende ergibt sich eine freie Zeit
            vom
            <strong>2. bis 17. Oktober 2027 –
            insgesamt 16 Kalendertage</strong>.
          </p>
        </section>`;
}

function rheinlandPfalz2027RelatedLinksHtml() {
  return stateYearGoldRelatedLinksHtml([
    {
      href:
        "/schulferien-rheinland-pfalz-2026.html",
      label:
        "Schulferien Rheinland-Pfalz 2026",
    },
    {
      href:
        "/schulferien-rheinland-pfalz-2028.html",
      label:
        "Schulferien Rheinland-Pfalz 2028",
    },
    {
      href:
        "/schulferien-rheinland-pfalz.html",
      label:
        "Alle Jahre für Rheinland-Pfalz",
    },
    {
      href:
        "/schulferien-2027.html",
      label:
        "Alle Bundesländer 2027",
    },
    {
      href:
        "/schulferien-hessen-2027.html",
      label:
        "Hessen 2027",
    },
    {
      href:
        "/schulferien-saarland-2027.html",
      label:
        "Saarland 2027",
    },
    {
      href:
        "/schulferien-nordrhein-westfalen-2027.html",
      label:
        "Nordrhein-Westfalen 2027",
    },
    {
      href:
        "/schulferien-baden-wuerttemberg-2027.html",
      label:
        "Baden-Württemberg 2027",
    },
  ]);
}

function rheinlandPfalz2027GoldPageTemplate({
  slug,
  name,
  code,
  year,
  events,
}) {
  const faqItems =
    createRheinlandPfalz2027FaqItems(
      events,
    );

  return stateYearGoldPageTemplate({
    slug,
    name,
    code,
    year,
    events,
    title:
      "Schulferien Rheinland-Pfalz 2027: Termine und freie Tage",
    description:
      "Schulferien Rheinland-Pfalz 2027 mit Osterferien, Sommerferien, Herbstferien, Weihnachtsferien, beweglichen Ferientagen, PDF, ICS und offizieller Quelle.",
    marker:
      "rheinland-pfalz-2027",
    eyebrow:
      "Rheinland-Pfalz · Kalenderjahr 2027",
    h1:
      "Schulferien Rheinland-Pfalz 2027",
    introText:
      `Hier stehen zuerst die landesweit festgelegten
Ferientermine für Rheinland-Pfalz. Zusätzlich zeigt
Schulferienklar, wie lange die freie Zeit direkt am
Stück dauert, wenn Wochenenden oder landesweite
Feiertage unmittelbar anschließen.`,
    specialNavLabel:
      "Rheinland-Pfalz-Hinweise",
    termHeadingText:
      "Alle Ferienzeiten in Rheinland-Pfalz 2027",
    termIntroText:
      `Die offizielle Ferienübersicht führt
Osterferien, Sommerferien, Herbstferien und
Weihnachtsferien. Winterferien und Pfingstferien
sind für 2027 nicht ausgewiesen. Bewegliche
Ferientage ohne landesweit einheitliches Datum
werden nicht automatisch eingerechnet.`,
    renderPeriodRows:
      ({
        events,
        publicHolidays,
        year,
      }) => {
        return stateYearGoldPeriodRowsHtml({
          events,
          publicHolidays,
          year,
          getPeriodNote:
            getRheinlandPfalz2027PeriodNote,
        });
      },
    officialPeriodText:
      `Exakt der vom Ministerium für Bildung
Rheinland-Pfalz veröffentlichte Beginn und das
veröffentlichte Ende des jeweiligen
Ferienzeitraums.`,
    connectedPeriodText:
      `Der offizielle Zeitraum plus direkt
anschließende Samstage, Sonntage und
landesweit geltende gesetzliche Feiertage.`,
    calculationNoteText:
      `Angegeben werden Kalendertage, nicht die Zahl
der ausgefallenen Unterrichtstage. Bewegliche
Ferientage ohne landesweit festgelegtes Datum
werden nicht automatisch eingerechnet.`,
    specialSectionHtml:
      rheinlandPfalz2027SpecialSectionHtml(),
    sourceLinkLabel:
      "Ferientermine des Bildungsministeriums",
    secondaryLinkLabel:
      "Ferienregelung der KMK",
    faqItems,
    relatedLinksHtml:
      rheinlandPfalz2027RelatedLinksHtml(),
    buttonText:
      "Rheinland-Pfalz 2027 im Kalender öffnen",
  });
}

function hessen2027SpecialSectionHtml() {
  return `        <section
          id="besonderheiten"
          class="gold-section"
        >
          <p class="eyebrow">
            Wichtig für Hessen
          </p>
          <h2>
            Winterferien, Pfingstferien und bewegliche Ferientage 2027
          </h2>

          <div class="gold-terminology-grid">
            <div>
              <h3>Keine einheitlichen Winter- oder Pfingstferien</h3>
              <p>
                Die offizielle hessische
                Ferienübersicht führt für 2027
                <strong>keine landesweit
                einheitlichen Winterferien oder
                Pfingstferien</strong> auf.
              </p>
              <p>
                Deshalb erscheinen diese Zeiträume
                nicht als Ferienblöcke in der
                landesweiten Standardübersicht.
              </p>
            </div>

            <div>
              <h3>Bewegliche Ferientage</h3>
              <p>
                Die offizielle Übersicht weist
                zusätzlich
                <strong>bewegliche Ferientage</strong>
                aus.
              </p>
              <p>
                Ihre konkreten Termine sind nicht
                landesweit einheitlich festgelegt.
                Deshalb werden sie hier nicht
                automatisch eingerechnet.
              </p>
            </div>
          </div>

          <p class="gold-source-note">
            <strong>Herbst 2027:</strong>
            Die Herbstferien beginnen am
            4. Oktober. Mit dem Wochenende und dem
            Tag der Deutschen Einheit unmittelbar
            davor ergibt sich eine zusammenhängende
            freie Zeit vom
            <strong>2. bis 17. Oktober 2027 –
            insgesamt 16 Kalendertage</strong>.
          </p>
        </section>`;
}

function hessen2027RelatedLinksHtml() {
  return stateYearGoldRelatedLinksHtml([
    {
      href:
        "/schulferien-hessen-2026.html",
      label:
        "Schulferien Hessen 2026",
    },
    {
      href:
        "/schulferien-hessen-2028.html",
      label:
        "Schulferien Hessen 2028",
    },
    {
      href:
        "/schulferien-hessen.html",
      label:
        "Alle Jahre für Hessen",
    },
    {
      href:
        "/schulferien-2027.html",
      label:
        "Alle Bundesländer 2027",
    },
    {
      href:
        "/schulferien-nordrhein-westfalen-2027.html",
      label:
        "Nordrhein-Westfalen 2027",
    },
    {
      href:
        "/schulferien-rheinland-pfalz-2027.html",
      label:
        "Rheinland-Pfalz 2027",
    },
    {
      href:
        "/schulferien-bayern-2027.html",
      label:
        "Bayern 2027",
    },
    {
      href:
        "/schulferien-thueringen-2027.html",
      label:
        "Thüringen 2027",
    },
  ]);
}

function hessen2027GoldPageTemplate({
  slug,
  name,
  code,
  year,
  events,
}) {
  const faqItems =
    createHessen2027FaqItems(
      events,
    );

  return stateYearGoldPageTemplate({
    slug,
    name,
    code,
    year,
    events,
    title:
      "Schulferien Hessen 2027: Termine und freie Tage",
    description:
      "Schulferien Hessen 2027 mit Osterferien, Sommerferien, Herbstferien, Weihnachtsferien, beweglichen Ferientagen, PDF, ICS und offizieller Quelle.",
    marker:
      "hessen-2027",
    eyebrow:
      "Hessen · Kalenderjahr 2027",
    h1:
      "Schulferien Hessen 2027",
    introText:
      `Hier stehen zuerst die landesweit festgelegten
Ferientermine für Hessen. Zusätzlich zeigt
Schulferienklar, wie lange die freie Zeit direkt am
Stück dauert, wenn Wochenenden oder landesweite
Feiertage unmittelbar anschließen.`,
    specialNavLabel:
      "Hessen-Hinweise",
    termHeadingText:
      "Alle Ferienzeiten in Hessen 2027",
    termIntroText:
      `Die offizielle hessische Ferienübersicht führt
Osterferien, Sommerferien, Herbstferien und
Weihnachtsferien. Einheitliche Winterferien oder
Pfingstferien sind für 2027 nicht ausgewiesen.
Bewegliche Ferientage ohne landesweit einheitliches
Datum werden nicht automatisch eingerechnet.`,
    renderPeriodRows:
      ({
        events,
        publicHolidays,
        year,
      }) => {
        return stateYearGoldPeriodRowsHtml({
          events,
          publicHolidays,
          year,
          getPeriodNote:
            getHessen2027PeriodNote,
        });
      },
    officialPeriodText:
      `Exakt der vom Hessischen Ministerium für
Kultus, Bildung und Chancen veröffentlichte Beginn
und das veröffentlichte Ende des jeweiligen
Ferienzeitraums.`,
    connectedPeriodText:
      `Der offizielle Zeitraum plus direkt
anschließende Samstage, Sonntage und
landesweit geltende gesetzliche Feiertage.`,
    calculationNoteText:
      `Angegeben werden Kalendertage, nicht die Zahl
der ausgefallenen Unterrichtstage. Bewegliche
Ferientage ohne landesweit festgelegtes Datum
werden nicht automatisch eingerechnet.`,
    specialSectionHtml:
      hessen2027SpecialSectionHtml(),
    sourceLinkLabel:
      "Ferientermine des Hessischen Kultusministeriums",
    secondaryLinkLabel:
      "Ferienregelung der KMK",
    faqItems,
    relatedLinksHtml:
      hessen2027RelatedLinksHtml(),
    buttonText:
      "Hessen 2027 im Kalender öffnen",
  });
}

function hamburg2027SpecialSectionHtml() {
  return `        <section
          id="besonderheiten"
          class="gold-section"
        >
          <p class="eyebrow">
            Wichtig für Hamburg
          </p>
          <h2>
            Halbjahrespause und Himmelfahrt/Pfingsten 2027
          </h2>

          <div class="gold-terminology-grid">
            <div>
              <h3>Halbjahrespause: 3 Tage frei</h3>
              <p>
                Die offizielle Ferienordnung nennt
                <strong>Freitag, den
                29. Januar 2027</strong>,
                als Halbjahrespause.
              </p>
              <p>
                Mit Samstag und Sonntag entstehen
                <strong>3 freie Tage vom 29. bis
                31. Januar 2027</strong>.
              </p>
            </div>

            <div>
              <h3>Himmelfahrt/Pfingsten: 12 Tage</h3>
              <p>
                Der offizielle Ferienzeitraum läuft vom
                <strong>7. bis 14. Mai 2027</strong>.
              </p>
              <p>
                Christi Himmelfahrt davor sowie
                Wochenende und Pfingstmontag danach
                verlängern die freie Zeit auf
                <strong>6. bis 17. Mai 2027 –
                insgesamt 12 Tage</strong>.
              </p>
            </div>
          </div>

          <p class="gold-source-note">
            <strong>Hamburger Bezeichnungen:</strong>
            Die Ferienordnung verwendet ausdrücklich
            die Begriffe Halbjahrespause,
            Frühjahrsferien und
            Himmelfahrt/Pfingsten. Schulferienklar
            übernimmt diese offiziellen Bezeichnungen.
          </p>
        </section>`;
}

function hamburg2027RelatedLinksHtml() {
  return stateYearGoldRelatedLinksHtml([
    {
      href:
        "/schulferien-hamburg-2026.html",
      label:
        "Schulferien Hamburg 2026",
    },
    {
      href:
        "/schulferien-hamburg-2028.html",
      label:
        "Schulferien Hamburg 2028",
    },
    {
      href:
        "/schulferien-hamburg.html",
      label:
        "Alle Jahre für Hamburg",
    },
    {
      href:
        "/schulferien-2027.html",
      label:
        "Alle Bundesländer 2027",
    },
    {
      href:
        "/schulferien-schleswig-holstein-2027.html",
      label:
        "Schleswig-Holstein 2027",
    },
    {
      href:
        "/schulferien-niedersachsen-2027.html",
      label:
        "Niedersachsen 2027",
    },
    {
      href:
        "/schulferien-bremen-2027.html",
      label:
        "Bremen 2027",
    },
    {
      href:
        "/schulferien-mecklenburg-vorpommern-2027.html",
      label:
        "Mecklenburg-Vorpommern 2027",
    },
  ]);
}

function hamburg2027GoldPageTemplate({
  slug,
  name,
  code,
  year,
  events,
}) {
  const faqItems =
    createHamburg2027FaqItems(
      events,
    );

  return stateYearGoldPageTemplate({
    slug,
    name,
    code,
    year,
    events,
    title:
      "Schulferien Hamburg 2027: Termine und freie Tage",
    description:
      "Schulferien Hamburg 2027 mit Halbjahrespause, Frühjahrsferien, Himmelfahrt/Pfingsten, Sommerferien, Herbstferien, PDF, ICS und offizieller Quelle.",
    marker:
      "hamburg-2027",
    eyebrow:
      "Hamburg · Kalenderjahr 2027",
    h1:
      "Schulferien Hamburg 2027",
    introText:
      `Hier stehen zuerst die offiziell festgelegten
Ferientermine für Hamburg. Zusätzlich zeigt
Schulferienklar, wie lange die freie Zeit direkt am
Stück dauert, wenn Wochenenden oder landesweite
Feiertage unmittelbar anschließen.`,
    specialNavLabel:
      "Hamburg-Hinweise",
    termHeadingText:
      "Alle Ferienzeiten in Hamburg 2027",
    termIntroText:
      `Die Übersicht übernimmt die Hamburger
Bezeichnungen aus der offiziellen Ferienordnung,
darunter Halbjahrespause, Frühjahrsferien und
Himmelfahrt/Pfingsten. Weihnachtsferien, die aus
2026 in das Kalenderjahr 2027 hineinreichen, sind
ebenfalls enthalten.`,
    renderPeriodRows:
      ({
        events,
        publicHolidays,
        year,
      }) => {
        return stateYearGoldPeriodRowsHtml({
          events,
          publicHolidays,
          year,
          getPeriodNote:
            getHamburg2027PeriodNote,
        });
      },
    officialPeriodText:
      `Exakt der von der Hamburger Schulbehörde
veröffentlichte Beginn und das veröffentlichte Ende
des jeweiligen Ferienzeitraums beziehungsweise der
offiziell aufgeführten Halbjahrespause.`,
    connectedPeriodText:
      `Der offizielle Zeitraum plus direkt
anschließende Samstage, Sonntage und
landesweit geltende gesetzliche Feiertage.`,
    calculationNoteText:
      `Angegeben werden Kalendertage, nicht die Zahl
der ausgefallenen Unterrichtstage. Erweiterungen
erfolgen nur bei unmittelbar angrenzenden
Wochenenden oder landesweiten Feiertagen.`,
    specialSectionHtml:
      hamburg2027SpecialSectionHtml(),
    sourceLinkLabel:
      "Ferienordnung Hamburg 2024/25 bis 2029/30",
    secondaryLinkLabel:
      "Ferientermine der Hamburger Schulbehörde",
    faqItems,
    relatedLinksHtml:
      hamburg2027RelatedLinksHtml(),
    buttonText:
      "Hamburg 2027 im Kalender öffnen",
  });
}

function sachsenAnhalt2027SpecialSectionHtml() {
  return `        <section
          id="besonderheiten"
          class="gold-section"
        >
          <p class="eyebrow">
            Wichtig für Sachsen-Anhalt
          </p>
          <h2>
            Ostern und bewegliche Ferientage 2027
          </h2>

          <div class="gold-terminology-grid">
            <div>
              <h3>Ostern: 10 Tage am Stück</h3>
              <p>
                Die offiziellen Osterferien dauern vom
                <strong>22. bis 27. März 2027</strong>.
              </p>
              <p>
                Mit den angrenzenden Wochenendtagen
                und Ostermontag entstehen
                <strong>10 freie Tage vom 20. bis
                29. März 2027</strong>.
              </p>
            </div>

            <div>
              <h3>Bewegliche Ferientage</h3>
              <p>
                Die Ferienregelung weist zusätzlich
                <strong>bewegliche Ferientage</strong>
                aus.
              </p>
              <p>
                Die konkreten Termine sind nicht
                landesweit festgelegt. Deshalb werden
                sie hier nicht automatisch in die
                Standardübersicht eingerechnet.
              </p>
            </div>
          </div>

          <p class="gold-source-note">
            <strong>6. Januar in Sachsen-Anhalt:</strong>
            Heilige Drei Könige ist 2027 ein
            landesweiter gesetzlicher Feiertag.
            Er verlängert die Weihnachtsferien nicht
            zusammenhängend, weil der 4. und 5. Januar
            nicht zum offiziellen Ferienzeitraum
            gehören.
          </p>
        </section>`;
}

function sachsenAnhalt2027RelatedLinksHtml() {
  return stateYearGoldRelatedLinksHtml([
    {
      href:
        "/schulferien-sachsen-anhalt-2026.html",
      label:
        "Schulferien Sachsen-Anhalt 2026",
    },
    {
      href:
        "/schulferien-sachsen-anhalt-2028.html",
      label:
        "Schulferien Sachsen-Anhalt 2028",
    },
    {
      href:
        "/schulferien-sachsen-anhalt.html",
      label:
        "Alle Jahre für Sachsen-Anhalt",
    },
    {
      href:
        "/schulferien-2027.html",
      label:
        "Alle Bundesländer 2027",
    },
    {
      href:
        "/schulferien-sachsen-2027.html",
      label:
        "Sachsen 2027",
    },
    {
      href:
        "/schulferien-thueringen-2027.html",
      label:
        "Thüringen 2027",
    },
    {
      href:
        "/schulferien-brandenburg-2027.html",
      label:
        "Brandenburg 2027",
    },
    {
      href:
        "/schulferien-niedersachsen-2027.html",
      label:
        "Niedersachsen 2027",
    },
  ]);
}

function sachsenAnhalt2027GoldPageTemplate({
  slug,
  name,
  code,
  year,
  events,
}) {
  const faqItems =
    createSachsenAnhalt2027FaqItems(
      events,
    );

  return stateYearGoldPageTemplate({
    slug,
    name,
    code,
    year,
    events,
    title:
      "Schulferien Sachsen-Anhalt 2027: Termine und freie Tage",
    description:
      "Schulferien Sachsen-Anhalt 2027 mit Winterferien, Osterferien, Pfingstferien, Sommerferien, Herbstferien, PDF, ICS und offizieller Quelle.",
    marker:
      "sachsen-anhalt-2027",
    eyebrow:
      "Sachsen-Anhalt · Kalenderjahr 2027",
    h1:
      "Schulferien Sachsen-Anhalt 2027",
    introText:
      `Hier stehen zuerst die landesweit festgelegten
Ferientermine. Zusätzlich zeigt Schulferienklar,
wie lange die freie Zeit direkt am Stück dauert,
wenn Wochenenden oder landesweite Feiertage
unmittelbar anschließen.`,
    specialNavLabel:
      "Sachsen-Anhalt-Hinweise",
    termHeadingText:
      "Alle Ferienzeiten in Sachsen-Anhalt 2027",
    termIntroText:
      `Die Liste berücksichtigt auch Weihnachtsferien,
die aus 2026 in das Kalenderjahr 2027 hineinreichen.
Bewegliche Ferientage ohne landesweit festgelegtes
Datum werden nicht automatisch eingerechnet.`,
    renderPeriodRows:
      ({
        events,
        publicHolidays,
        year,
      }) => {
        return stateYearGoldPeriodRowsHtml({
          events,
          publicHolidays,
          year,
          getPeriodNote:
            getSachsenAnhalt2027PeriodNote,
        });
      },
    officialPeriodText:
      `Exakt der vom Ministerium für Bildung des
Landes Sachsen-Anhalt veröffentlichte Beginn und
das veröffentlichte Ende des Ferienzeitraums.`,
    connectedPeriodText:
      `Der offizielle Zeitraum plus direkt
anschließende Samstage, Sonntage und
landesweit geltende gesetzliche Feiertage.`,
    calculationNoteText:
      `Angegeben werden Kalendertage, nicht die Zahl
der ausgefallenen Unterrichtstage. Bewegliche
Ferientage ohne landesweit festgelegtes Datum
werden nicht automatisch eingerechnet.`,
    specialSectionHtml:
      sachsenAnhalt2027SpecialSectionHtml(),
    sourceLinkLabel:
      "Ferienregelung 2024/25 bis 2029/30",
    secondaryLinkLabel:
      "Ferientermine des Bildungsministeriums",
    faqItems,
    relatedLinksHtml:
      sachsenAnhalt2027RelatedLinksHtml(),
    buttonText:
      "Sachsen-Anhalt 2027 im Kalender öffnen",
  });
}

function thueringen2027SpecialSectionHtml() {
  return `        <section
          id="besonderheiten"
          class="gold-section"
        >
          <p class="eyebrow">
            Wichtig für Thüringen
          </p>
          <h2>
            Schulfreier Tag und Ferientage zur freien Verfügung 2027
          </h2>

          <div class="gold-terminology-grid">
            <div>
              <h3>7. Mai: landesweit schulfrei</h3>
              <p>
                Freitag, der
                <strong>7. Mai 2027</strong>,
                ist in Thüringen landesweit
                <strong>schulfrei</strong>.
              </p>
              <p>
                Mit Christi Himmelfahrt am Donnerstag
                und dem Wochenende entstehen
                <strong>4 freie Tage vom 6. bis
                9. Mai 2027</strong>.
              </p>
            </div>

            <div>
              <h3>Ferientage zur freien Verfügung</h3>
              <p>
                Zusätzlich gibt es
                <strong>Ferientage zur freien
                Verfügung</strong>.
              </p>
              <p>
                Über deren Verwendung entscheidet die
                jeweilige Schulkonferenz. Deshalb werden
                diese schulbezogenen Termine nicht
                automatisch in die landesweite
                Standardübersicht eingerechnet.
              </p>
            </div>
          </div>

          <p class="gold-source-note">
            <strong>Feiertage in Thüringen:</strong>
            Der Weltkindertag am 20. September 2027
            gilt landesweit. Fronleichnam gilt dagegen
            nur in bestimmten Regionen und wird deshalb
            nicht als landesweiter Feiertag in die
            Standardberechnung einbezogen.
          </p>
        </section>`;
}

function thueringen2027RelatedLinksHtml() {
  return stateYearGoldRelatedLinksHtml([
    {
      href:
        "/schulferien-thueringen-2026.html",
      label:
        "Schulferien Thüringen 2026",
    },
    {
      href:
        "/schulferien-thueringen-2028.html",
      label:
        "Schulferien Thüringen 2028",
    },
    {
      href:
        "/schulferien-thueringen.html",
      label:
        "Alle Jahre für Thüringen",
    },
    {
      href:
        "/schulferien-2027.html",
      label:
        "Alle Bundesländer 2027",
    },
    {
      href:
        "/schulferien-sachsen-2027.html",
      label:
        "Sachsen 2027",
    },
    {
      href:
        "/schulferien-sachsen-anhalt-2027.html",
      label:
        "Sachsen-Anhalt 2027",
    },
    {
      href:
        "/schulferien-bayern-2027.html",
      label:
        "Bayern 2027",
    },
    {
      href:
        "/schulferien-hessen-2027.html",
      label:
        "Hessen 2027",
    },
  ]);
}

function thueringen2027GoldPageTemplate({
  slug,
  name,
  code,
  year,
  events,
}) {
  const faqItems =
    createThueringen2027FaqItems(
      events,
    );

  return stateYearGoldPageTemplate({
    slug,
    name,
    code,
    year,
    events,
    title:
      "Schulferien Thüringen 2027: Termine und freie Tage",
    description:
      "Schulferien Thüringen 2027 mit Winterferien, Osterferien, schulfreier Zeit am 7. Mai, Sommerferien, Herbstferien, PDF, ICS und offizieller Quelle.",
    marker:
      "thueringen-2027",
    eyebrow:
      "Thüringen · Kalenderjahr 2027",
    h1:
      "Schulferien Thüringen 2027",
    introText:
      `Hier stehen zuerst die landesweit festgelegten
Ferientermine und schulfreien Tage. Zusätzlich zeigt
Schulferienklar, wie lange die freie Zeit direkt am
Stück dauert, wenn Wochenenden oder landesweite
Feiertage unmittelbar anschließen.`,
    specialNavLabel:
      "Thüringen-Hinweise",
    termHeadingText:
      "Alle Ferienzeiten und schulfreien Tage in Thüringen 2027",
    termIntroText:
      `Die Liste berücksichtigt auch Weihnachtsferien,
die aus 2026 in das Kalenderjahr 2027 hineinreichen.
Zusätzlich ist der landesweit festgelegte schulfreie
Tag am 7. Mai enthalten.`,
    renderPeriodRows:
      ({
        events,
        publicHolidays,
        year,
      }) => {
        return stateYearGoldPeriodRowsHtml({
          events,
          publicHolidays,
          year,
          getDisplayName:
            getThueringen2027DisplayName,
          getPeriodNote:
            getThueringen2027PeriodNote,
        });
      },
    officialPeriodText:
      `Exakt der vom Thüringer Bildungsministerium
veröffentlichte Beginn und das veröffentlichte Ende
beziehungsweise der landesweit festgelegte
schulfreie Tag.`,
    connectedPeriodText:
      `Der offizielle Zeitraum plus direkt
anschließende Samstage, Sonntage und
landesweit geltende gesetzliche Feiertage.`,
    calculationNoteText:
      `Angegeben werden Kalendertage, nicht die Zahl
der ausgefallenen Unterrichtstage. Ferientage zur
freien Verfügung und nur regional geltende Feiertage
werden nicht automatisch eingerechnet.`,
    specialSectionHtml:
      thueringen2027SpecialSectionHtml(),
    sourceLinkLabel:
      "Ferienregelung des Bildungsministeriums",
    secondaryLinkLabel:
      "Ferienregelung der Kultusministerkonferenz",
    faqItems,
    relatedLinksHtml:
      thueringen2027RelatedLinksHtml(),
    buttonText:
      "Thüringen 2027 im Kalender öffnen",
  });
}

function sachsen2027SpecialSectionHtml() {
  return `        <section
          id="besonderheiten"
          class="gold-section"
        >
          <p class="eyebrow">
            Wichtig für Sachsen
          </p>
          <h2>
            Unterrichtsfreier Tag und frei beweglicher Ferientag 2027
          </h2>

          <div class="gold-terminology-grid">
            <div>
              <h3>7. Mai: unterrichtsfrei</h3>
              <p>
                Freitag, der
                <strong>7. Mai 2027</strong>,
                ist ein vom Kultusministerium
                festgelegter
                <strong>unterrichtsfreier Tag</strong>.
              </p>
              <p>
                Mit Christi Himmelfahrt am Donnerstag
                und dem Wochenende entstehen
                <strong>4 freie Tage vom 6. bis
                9. Mai 2027</strong>.
              </p>
            </div>

            <div>
              <h3>1 frei beweglicher Ferientag</h3>
              <p>
                Im Schuljahr 2026/27 gibt es zusätzlich
                <strong>einen frei beweglichen
                Ferientag</strong>.
              </p>
              <p>
                Den konkreten Termin kann jede Schule
                in Abstimmung mit der Schulverwaltung
                selbst festlegen. Deshalb wird dieser
                Tag hier nicht automatisch eingerechnet.
              </p>
            </div>
          </div>

          <p class="gold-source-note">
            <strong>Feiertage in Sachsen:</strong>
            Fronleichnam gilt nur in bestimmten Regionen
            und wird deshalb nicht als landesweiter
            Feiertag in die Standardberechnung
            einbezogen. Der Buß- und Bettag gilt dagegen
            landesweit in Sachsen.
          </p>
        </section>`;
}

function sachsen2027RelatedLinksHtml() {
  return stateYearGoldRelatedLinksHtml([
    {
      href:
        "/schulferien-sachsen-2026.html",
      label:
        "Schulferien Sachsen 2026",
    },
    {
      href:
        "/schulferien-sachsen-2028.html",
      label:
        "Schulferien Sachsen 2028",
    },
    {
      href:
        "/schulferien-sachsen.html",
      label:
        "Alle Jahre für Sachsen",
    },
    {
      href:
        "/schulferien-2027.html",
      label:
        "Alle Bundesländer 2027",
    },
    {
      href:
        "/schulferien-berlin-2027.html",
      label:
        "Berlin 2027",
    },
    {
      href:
        "/schulferien-brandenburg-2027.html",
      label:
        "Brandenburg 2027",
    },
    {
      href:
        "/schulferien-sachsen-anhalt-2027.html",
      label:
        "Sachsen-Anhalt 2027",
    },
    {
      href:
        "/schulferien-thueringen-2027.html",
      label:
        "Thüringen 2027",
    },
  ]);
}

function sachsen2027GoldPageTemplate({
  slug,
  name,
  code,
  year,
  events,
}) {
  const faqItems =
    createSachsen2027FaqItems(
      events,
    );

  return stateYearGoldPageTemplate({
    slug,
    name,
    code,
    year,
    events,
    title:
      "Schulferien Sachsen 2027: Termine und freie Tage",
    description:
      "Schulferien Sachsen 2027 mit Winterferien, Osterferien, Pfingstferien, unterrichtsfreiem Tag, beweglichem Ferientag, PDF, ICS und offizieller Quelle.",
    marker:
      "sachsen-2027",
    eyebrow:
      "Sachsen · Kalenderjahr 2027",
    h1:
      "Schulferien Sachsen 2027",
    introText:
      `Hier stehen zuerst die landesweit festgelegten
Ferientermine und schulfreien Tage. Zusätzlich zeigt
Schulferienklar, wie lange die freie Zeit direkt am
Stück dauert, wenn Wochenenden oder landesweite
Feiertage unmittelbar anschließen.`,
    specialNavLabel:
      "Sachsen-Hinweise",
    termHeadingText:
      "Alle Ferienzeiten und schulfreien Tage in Sachsen 2027",
    termIntroText:
      `Die Liste berücksichtigt auch Weihnachtsferien,
die aus 2026 in das Kalenderjahr 2027 hineinreichen
oder bis 2028 dauern. Zusätzlich ist der vom
Kultusministerium festgelegte unterrichtsfreie Tag
enthalten.`,
    renderPeriodRows:
      ({
        events,
        publicHolidays,
        year,
      }) => {
        return stateYearGoldPeriodRowsHtml({
          events,
          publicHolidays,
          year,
          getDisplayName:
            getSachsen2027DisplayName,
          getPeriodNote:
            getSachsen2027PeriodNote,
        });
      },
    officialPeriodText:
      `Exakt der vom Sächsischen Staatsministerium
für Kultus veröffentlichte Beginn und das
veröffentlichte Ende beziehungsweise der
landesweit festgelegte unterrichtsfreie Tag.`,
    connectedPeriodText:
      `Der offizielle Zeitraum plus direkt
anschließende Samstage, Sonntage und
landesweit geltende gesetzliche Feiertage.`,
    calculationNoteText:
      `Angegeben werden Kalendertage, nicht die Zahl
der ausgefallenen Unterrichtstage. Frei bewegliche
Ferientage und nur regional geltende Feiertage werden
nicht automatisch eingerechnet.`,
    specialSectionHtml:
      sachsen2027SpecialSectionHtml(),
    sourceLinkLabel:
      "Schuljahrestermine des Kultusministeriums",
    secondaryLinkLabel:
      "Ferienregelung der Kultusministerkonferenz",
    faqItems,
    relatedLinksHtml:
      sachsen2027RelatedLinksHtml(),
    buttonText:
      "Sachsen 2027 im Kalender öffnen",
  });
}

function berlin2027SpecialSectionHtml() {
  return `        <section
          id="besonderheiten"
          class="gold-section"
        >
          <p class="eyebrow">
            Berliner Besonderheiten
          </p>
          <h2>
            Unterrichtsfreier Tag und Pfingstferien 2027
          </h2>

          <div class="gold-terminology-grid">
            <div>
              <h3>7. Mai: unterrichtsfrei</h3>
              <p>
                Freitag, der
                <strong>7. Mai 2027</strong>,
                ist als
                <strong>Unterrichtsfreier Tag nach AZVO</strong>
                ausgewiesen.
              </p>
              <p>
                Mit Christi Himmelfahrt am Donnerstag
                und dem Wochenende entstehen
                <strong>4 freie Tage vom 6. bis
                9. Mai 2027</strong>.
              </p>
            </div>

            <div>
              <h3>Pfingstferien</h3>
              <p>
                Die Berliner Pfingstferien liegen am
                <strong>18. und 19. Mai 2027</strong>.
              </p>
              <p>
                Mit dem Wochenende und Pfingstmontag
                entstehen
                <strong>5 freie Tage vom 15. bis
                19. Mai 2027</strong>.
              </p>
            </div>
          </div>

          <p class="gold-source-note">
            <strong>Weitere Berlin-Hinweise:</strong>
            Der Internationale Frauentag am
            8. März 2027 ist in Berlin ein gesetzlicher
            Feiertag. Für einzelne Berliner Schulen
            gelten außerdem eigene Ferienordnungen;
            diese Sonderkalender sind hier nicht
            automatisch enthalten.
          </p>
        </section>`;
}

function berlin2027RelatedLinksHtml() {
  return stateYearGoldRelatedLinksHtml([
    {
      href:
        "/schulferien-berlin-2026.html",
      label:
        "Schulferien Berlin 2026",
    },
    {
      href:
        "/schulferien-berlin-2028.html",
      label:
        "Schulferien Berlin 2028",
    },
    {
      href:
        "/schulferien-berlin.html",
      label:
        "Alle Jahre für Berlin",
    },
    {
      href:
        "/schulferien-2027.html",
      label:
        "Alle Bundesländer 2027",
    },
    {
      href:
        "/schulferien-brandenburg-2027.html",
      label:
        "Brandenburg 2027",
    },
    {
      href:
        "/schulferien-sachsen-2027.html",
      label:
        "Sachsen 2027",
    },
    {
      href:
        "/schulferien-thueringen-2027.html",
      label:
        "Thüringen 2027",
    },
    {
      href:
        "/schulferien-niedersachsen-2027.html",
      label:
        "Niedersachsen 2027",
    },
  ]);
}

function berlin2027GoldPageTemplate({
  slug,
  name,
  code,
  year,
  events,
}) {
  const faqItems =
    createBerlin2027FaqItems(
      events,
    );

  return stateYearGoldPageTemplate({
    slug,
    name,
    code,
    year,
    events,
    title:
      "Schulferien Berlin 2027: Termine und freie Tage",
    description:
      "Schulferien Berlin 2027 mit Winterferien, Osterferien, unterrichtsfreiem AZVO-Tag, Pfingstferien, Sommerferien, PDF, ICS und offizieller Quelle.",
    marker:
      "berlin-2027",
    eyebrow:
      "Berlin · Kalenderjahr 2027",
    h1:
      "Schulferien Berlin 2027",
    introText:
      `Hier stehen zuerst die landesweit festgelegten
Ferientermine und schulfreien Tage. Zusätzlich zeigt
Schulferienklar, wie lange die freie Zeit direkt am
Stück dauert, wenn Wochenenden oder Berliner
Feiertage unmittelbar anschließen.`,
    specialNavLabel:
      "Berlin-Hinweise",
    termHeadingText:
      "Alle Ferienzeiten und schulfreien Tage in Berlin 2027",
    termIntroText:
      `Die Liste berücksichtigt auch Weihnachtsferien,
die aus 2026 in das Kalenderjahr 2027 hineinreichen.
Zusätzlich ist der offiziell festgelegte
unterrichtsfreie Tag nach AZVO enthalten.`,
    renderPeriodRows:
      ({
        events,
        publicHolidays,
        year,
      }) => {
        return stateYearGoldPeriodRowsHtml({
          events,
          publicHolidays,
          year,
          getDisplayName:
            getBerlin2027DisplayName,
          getPeriodNote:
            getBerlin2027PeriodNote,
        });
      },
    officialPeriodText:
      `Exakt der in der Berliner Ferienordnung
veröffentlichte Beginn und das veröffentlichte Ende
beziehungsweise der landesweit ausgewiesene
unterrichtsfreie Tag.`,
    connectedPeriodText:
      `Der offizielle Zeitraum plus direkt
anschließende Samstage, Sonntage und
landesweit geltende gesetzliche Feiertage.`,
    calculationNoteText:
      `Angegeben werden Kalendertage, nicht die Zahl
der ausgefallenen Unterrichtstage. Sonderkalender
einzelner Schulen und religiöse Unterrichtsbefreiungen
werden nicht automatisch eingerechnet.`,
    specialSectionHtml:
      berlin2027SpecialSectionHtml(),
    sourceLinkLabel:
      "Ferienordnung der Senatsverwaltung",
    secondaryLinkLabel:
      "Ferientermine auf Berlin.de",
    faqItems,
    relatedLinksHtml:
      berlin2027RelatedLinksHtml(),
    buttonText:
      "Berlin 2027 im Kalender öffnen",
  });
}

function niedersachsen2027SpecialSectionHtml() {
  return `        <section
          id="besonderheiten"
          class="gold-section"
        >
          <p class="eyebrow">
            Wichtig für Niedersachsen
          </p>
          <h2>
            Halbjahresferien und freie Tage im Mai 2027
          </h2>

          <div class="gold-terminology-grid">
            <div>
              <h3>Halbjahresferien</h3>
              <p>
                Die Halbjahresferien liegen 2027 am
                <strong>1. und 2. Februar</strong>.
                Sie sind ein eigener landesweit
                festgelegter Ferienzeitraum.
              </p>
            </div>

            <div>
              <h3>Freie Tage im Mai</h3>

              <p>
                <strong>Tag nach Himmelfahrt:</strong><br />
                Freitag, der 7. Mai 2027, ist landesweit
                schulfrei. Zusammen mit Christi
                Himmelfahrt und dem Wochenende entstehen
                <strong>4 freie Tage vom 6. bis
                9. Mai 2027</strong>.
              </p>

              <p>
                <strong>Pfingsten:</strong><br />
                Dienstag, der 18. Mai 2027, ist als
                Ferientag ausgewiesen. Mit dem Wochenende
                und Pfingstmontag entstehen
                <strong>4 freie Tage vom 15. bis
                18. Mai 2027</strong>.
              </p>
            </div>
          </div>

          <div class="gold-source-note">
            <strong>Abweichende Regelungen:</strong>
            Für bestimmte Schulen gelten eigene
            Ferientermine. Dazu gehören unter anderem
            Schulen auf den Ostfriesischen Inseln.
            Schulferienklar zeigt hier die landesweite
            Standardregelung.
          </div>
        </section>`;
}

function niedersachsen2027RelatedLinksHtml() {
  return stateYearGoldRelatedLinksHtml([
    {
      href:
        "/schulferien-niedersachsen-2026.html",
      label:
        "Schulferien Niedersachsen 2026",
    },
    {
      href:
        "/schulferien-niedersachsen-2028.html",
      label:
        "Schulferien Niedersachsen 2028",
    },
    {
      href:
        "/schulferien-niedersachsen.html",
      label:
        "Alle Jahre für Niedersachsen",
    },
    {
      href:
        "/schulferien-2027.html",
      label:
        "Alle Bundesländer 2027",
    },
    {
      href:
        "/schulferien-nordrhein-westfalen-2027.html",
      label:
        "Nordrhein-Westfalen 2027",
    },
    {
      href:
        "/schulferien-bremen-2027.html",
      label:
        "Bremen 2027",
    },
    {
      href:
        "/schulferien-hamburg-2027.html",
      label:
        "Hamburg 2027",
    },
    {
      href:
        "/schulferien-hessen-2027.html",
      label:
        "Hessen 2027",
    },
  ]);
}

function niedersachsen2027GoldPageTemplate({
  slug,
  name,
  code,
  year,
  events,
}) {
  const faqItems =
    createNi2027FaqItems(
      events,
    );

  return stateYearGoldPageTemplate({
    slug,
    name,
    code,
    year,
    events,
    title:
      "Schulferien Niedersachsen 2027: Termine und freie Tage",
    description:
      "Schulferien Niedersachsen 2027 mit Halbjahresferien, Osterferien, Tag nach Himmelfahrt, Pfingsten, Sommerferien, Herbstferien, Weihnachtsferien, PDF und offizieller Quelle.",
    marker:
      "ni-2027",
    eyebrow:
      "Niedersachsen · Kalenderjahr 2027",
    h1:
      "Schulferien Niedersachsen 2027",
    introText:
      `Hier stehen zuerst die landesweit festgelegten
Ferientermine und schulfreien Tage. Zusätzlich zeigt
Schulferienklar, wie lange die freie Zeit direkt am
Stück dauert, wenn Wochenenden oder landesweite
Feiertage unmittelbar anschließen.`,
    specialNavLabel:
      "NI-Hinweise",
    termHeadingText:
      "Alle Ferienzeiten und schulfreien Tage in Niedersachsen 2027",
    termIntroText:
      `Die Liste berücksichtigt auch Weihnachtsferien,
die aus 2026 in das Kalenderjahr 2027 hineinreichen
oder bis 2028 dauern. Zusätzlich sind die landesweit
festgelegten einzelnen freien Tage enthalten.`,
    renderPeriodRows:
      ({
        events,
        publicHolidays,
        year,
      }) => {
        return stateYearGoldPeriodRowsHtml({
          events,
          publicHolidays,
          year,
          getDisplayName:
            getNi2027DisplayName,
          getPeriodNote:
            getNi2027PeriodNote,
        });
      },
    officialPeriodText:
      `Exakt der in der niedersächsischen
Ferienordnung veröffentlichte Beginn und das
veröffentlichte Ende beziehungsweise der einzelne
landesweit festgelegte schulfreie Tag.`,
    connectedPeriodText:
      `Der offizielle Zeitraum plus direkt
anschließende Samstage, Sonntage und
landesweit geltende gesetzliche Feiertage.`,
    calculationNoteText:
      `Angegeben werden Kalendertage, nicht die Zahl
der ausgefallenen Unterrichtstage. Abweichende
Regelungen einzelner Schulen werden nicht
automatisch eingerechnet.`,
    specialSectionHtml:
      niedersachsen2027SpecialSectionHtml(),
    sourceLinkLabel:
      "Ferienordnung des Kultusministeriums",
    secondaryLinkLabel:
      "Schulferien beim Kultusministerium",
    faqItems,
    relatedLinksHtml:
      niedersachsen2027RelatedLinksHtml(),
    buttonText:
      "Niedersachsen 2027 im Kalender öffnen",
  });
}

function bw2027SpecialSectionHtml() {
  return `        <section
          id="besonderheiten"
          class="gold-section"
        >
          <p class="eyebrow">
            Wichtig für Baden-Württemberg
          </p>
          <h2>
            Gründonnerstag, bewegliche Ferientage
            und Samstage
          </h2>

          <div class="gold-terminology-grid">
            <div>
              <h3>
                Schulfrei am Gründonnerstag
              </h3>
              <p>
                Die offizielle Ferienübersicht weist
                <strong>Donnerstag, den 25. März 2027</strong>,
                ausdrücklich als schulfrei aus.
              </p>
              <p>
                Zusammen mit Karfreitag, dem Wochenende,
                Ostermontag und den anschließenden
                Osterferien entsteht eine durchgehende
                freie Zeit vom
                <strong>25. März bis 4. April 2027</strong>.
              </p>
            </div>

            <div>
              <h3>
                Nicht automatisch enthalten
              </h3>
              <p>
                <strong>Bewegliche Ferientage</strong>
                und
                <strong>unterrichtsfreie Samstage</strong>
                sind im landesweiten Standarddatensatz
                nicht enthalten.
              </p>
              <p>
                Zusätzliche schulfreie Termine sollten
                deshalb in der offiziellen Übersicht
                beziehungsweise direkt bei der eigenen
                Schule geprüft werden.
              </p>
            </div>
          </div>
        </section>`;
}

function bw2027RelatedLinksHtml() {
  return stateYearGoldRelatedLinksHtml([
    {
      href:
        "/schulferien-baden-wuerttemberg-2026.html",
      label:
        "Schulferien Baden-Württemberg 2026",
    },
    {
      href:
        "/schulferien-baden-wuerttemberg-2028.html",
      label:
        "Schulferien Baden-Württemberg 2028",
    },
    {
      href:
        "/schulferien-baden-wuerttemberg.html",
      label:
        "Alle Jahre für Baden-Württemberg",
    },
    {
      href:
        "/schulferien-2027.html",
      label:
        "Alle Bundesländer 2027",
    },
    {
      href:
        "/schulferien-bayern-2027.html",
      label:
        "Bayern 2027",
    },
    {
      href:
        "/schulferien-hessen-2027.html",
      label:
        "Hessen 2027",
    },
    {
      href:
        "/schulferien-rheinland-pfalz-2027.html",
      label:
        "Rheinland-Pfalz 2027",
    },
    {
      href:
        "/schulferien-nordrhein-westfalen-2027.html",
      label:
        "Nordrhein-Westfalen 2027",
    },
  ]);
}

function bw2027GoldPageTemplate({
  slug,
  name,
  code,
  year,
  events,
}) {
  const title =
    "Schulferien Baden-Württemberg 2027: Termine und freie Zeit";

  const description =
    "Schulferien Baden-Württemberg 2027 mit allen Terminen, Pfingstferien, schulfreiem Gründonnerstag, zusammenhängender freier Zeit, PDF, ICS und offizieller Quelle.";

  const publicHolidays =
    getPublicHolidaysAroundYear({
      publicHolidayIndex,
      code,
      year,
    });

  const source =
    getSchoolHolidaySourceForState({
      holidayIndex,
      code,
    });

  const faqItems =
    createBw2027FaqItems(
      events,
    );

  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link
      rel="canonical"
      href="https://www.schulferienklar.de/schulferien-${slug}-${year}.html"
    />
    <link
      rel="icon"
      type="image/svg+xml"
      href="/favicon.svg"
    />
    <link
      rel="icon"
      type="image/png"
      sizes="48x48"
      href="/favicon-48x48.png"
    />
    <link
      rel="apple-touch-icon"
      href="/apple-touch-icon.png"
    />
    <meta
      property="og:title"
      content="${title}"
    />
    <meta
      property="og:description"
      content="${description}"
    />
    <meta
      property="og:url"
      content="https://www.schulferienklar.de/schulferien-${slug}-${year}.html"
    />
    <meta
      property="og:image"
      content="https://www.schulferienklar.de/og-image.png"
    />
    ${sharedSeoStyles()}
${stateYearGoldStructuredDataHtml({
  faqItems,
  slug,
  name,
  year,
})}
  </head>

  <body class="seo-page">
    <main>
${seoTopNavHtml({
  appHref:
    `/?state=${code}&year=${year}`,
})}      <section
        class="card gold-page"
        data-gold-page="bw-2027"
      >
        <p class="eyebrow">
          Baden-Württemberg · Kalenderjahr 2027
        </p>

        <h1>
          Schulferien Baden-Württemberg 2027
        </h1>

        <p class="gold-page-intro">
          Hier stehen zuerst die landesweit
          veröffentlichten Ferien und schulfreien Tage.
          Zusätzlich zeigt Schulferienklar, wie lange die
          freie Zeit direkt am Stück dauert, wenn
          Wochenenden, Feiertage oder weitere
          landesweite schulfreie Tage direkt anschließen.
        </p>

${schulferienklarIntroCardHtml({
  appHref:
    `/?state=${code}&year=${year}`,
})}

        <nav
          class="gold-page-nav"
          aria-label="Inhalt dieser Seite"
        >
          <a href="#termine">
            Alle Termine
          </a>
          <a href="#berechnung">
            Freie Zeit
          </a>
          <a href="#jahreskalender">
            Jahreskalender
          </a>
          <a href="#widget">
            Widget
          </a>
          <a href="#besonderheiten">
            BW-Hinweise
          </a>
          <a href="#quelle">
            Quelle
          </a>
          <a href="#fragen">
            Fragen
          </a>
        </nav>

        <section
          id="termine"
          class="gold-section gold-answer-section"
        >
          <p class="eyebrow">
            Direkte Übersicht
          </p>

          <h2>
            Alle Ferienzeiten und schulfreien Tage
            in Baden-Württemberg 2027
          </h2>

          <p>
            Die Liste berücksichtigt Weihnachtsferien,
            die aus 2026 in das Kalenderjahr 2027
            hineinreichen oder bis 2028 dauern. Außerdem
            enthält sie den offiziell ausgewiesenen
            schulfreien Gründonnerstag.
          </p>

          <ul class="gold-period-list">
${stateYearGoldPeriodRowsHtml({
  events,
  publicHolidays,
  year,
  getDisplayName:
    getBw2027DisplayName,
  getPeriodNote:
    getBw2027PeriodNote,
  getConnectedPeriod:
    (event) => {
      return getConnectedFreePeriodWithSchoolEvents(
        event,
        publicHolidays,
        events,
      );
    },
})}
          </ul>
        </section>

        <section
          id="berechnung"
          class="gold-section"
        >
          <p class="eyebrow">
            Planung statt bloßer Datumsliste
          </p>

          <h2>
            Was „zusammenhängend frei“ bedeutet
          </h2>

          <div class="gold-explanation-grid">
            <div>
              <strong>
                Offizieller Zeitraum
              </strong>
              <p>
                Exakt der im baden-württembergischen
                Datensatz veröffentlichte Beginn und das
                veröffentlichte Ende eines Ferienzeitraums
                oder eines landesweit schulfreien Tages.
              </p>
            </div>

            <div>
              <strong>
                Zusammenhängend frei
              </strong>
              <p>
                Der offizielle Zeitraum plus direkt
                anschließende Wochenenden, landesweite
                Feiertage und weitere landesweit
                ausgewiesene schulfreie Tage.
              </p>
            </div>
          </div>

          <p class="gold-calculation-note">
            Angegeben werden Kalendertage, nicht die Zahl
            der ausgefallenen Unterrichtstage.
            Bewegliche Ferientage und unterrichtsfreie
            Samstage werden nicht automatisch eingerechnet.
          </p>
        </section>

${jahreskalenderHtml({
  slug,
  name,
  code,
  year,
})}

${widgetPromoHtml({
  code,
  name,
})}

${bw2027SpecialSectionHtml()}

${stateYearGoldSourceHtml({
  source,
  name,
  sourceLinkLabel:
    "Ferienübersicht des Kultusministeriums",
  secondaryLinkLabel:
    "Ferienregelung der Kultusministerkonferenz",
})}

${stateYearGoldFaqHtml({
  faqItems,
  name,
  year,
})}

${bw2027RelatedLinksHtml()}

        <a
          class="button"
          href="/?state=${code}&year=${year}"
        >
          Baden-Württemberg 2027 im Kalender öffnen
        </a>
      </section>

${seoFooterHtml()}    </main>
  </body>
</html>`;
}


function getBremen2027PeriodNote(event) {
  const crossingNote =
    getStateYearCrossingNote(
      event,
      2027,
    );

  if (crossingNote) {
    return crossingNote;
  }

  if (
    event.category ===
      "state_school_free_day" &&
    event.startDate ===
      "2027-05-07"
  ) {
    return (
      "Die zentrale Bremer Ferienübersicht führt " +
      "Freitag, den 7. Mai 2027, als Tag nach " +
      "Himmelfahrt."
    );
  }

  if (event.type === "winter") {
    return (
      "Die offizielle Bezeichnung in Bremen lautet " +
      "Halbjahresferien."
    );
  }

  if (event.type === "pentecost") {
    return (
      "Die Ferienübersicht nennt Dienstag, " +
      "den 18. Mai 2027."
    );
  }

  return "";
}

function findBremen2027SchoolFreeDay(events) {
  return events.find((event) => {
    return (
      event.category ===
        "state_school_free_day" &&
      event.startDate ===
        "2027-05-07"
    );
  });
}

function createBremen2027FaqItems(events) {
  const winter =
    findStateYearGoldEvent(
      events,
      "winter",
      2027,
    );

  const easter =
    findStateYearGoldEvent(
      events,
      "easter",
      2027,
    );

  const pentecost =
    findStateYearGoldEvent(
      events,
      "pentecost",
      2027,
    );

  const summer =
    findStateYearGoldEvent(
      events,
      "summer",
      2027,
    );

  const autumn =
    findStateYearGoldEvent(
      events,
      "autumn",
      2027,
    );

  const christmas =
    findStateYearGoldEvent(
      events,
      "christmas",
      2027,
    );

  const schoolFreeDay =
    findBremen2027SchoolFreeDay(
      events,
    );

  const rangeText = (event) => {
    if (!event) {
      return (
        "Für diesen Zeitraum liegt " +
        "aktuell kein Eintrag vor."
      );
    }

    return (
      `${formatDate(event.startDate)} bis ` +
      `${formatDate(event.endDate)}`
    );
  };

  return [
    {
      question:
        "Wann sind die Halbjahresferien in Bremen 2027?",
      answer:
        `Die Halbjahresferien in Bremen 2027 dauern vom ${rangeText(winter)}.`,
    },
    {
      question:
        "Wann sind die Osterferien in Bremen 2027?",
      answer:
        `Die Osterferien in Bremen 2027 dauern vom ${rangeText(easter)}.`,
    },
    {
      question:
        "Ist der 7. Mai 2027 in Bremen schulfrei?",
      answer:
        `Die zentrale Ferienübersicht des Landes Bremen führt Freitag, den ${schoolFreeDay ? formatDate(schoolFreeDay.startDate) : "07.05.2027"}, als „Tag nach Himmelfahrt“. Zusätzlich regelt § 2 der Ferienverordnung den beweglichen Ferientag der jeweiligen Schule. Bei einer abweichenden schulischen Festlegung sollte deshalb die eigene Schule geprüft werden.`,
    },
    {
      question:
        "Gibt es Pfingstferien in Bremen 2027?",
      answer:
        `Die offizielle Ferienübersicht nennt Dienstag, den ${pentecost ? formatDate(pentecost.startDate) : "18.05.2027"}, als Ferientag zu Pfingsten. Der veröffentlichte Zeitraum umfasst einen Tag.`,
    },
    {
      question:
        "Wann sind die Sommerferien in Bremen 2027?",
      answer:
        `Die Sommerferien in Bremen 2027 dauern vom ${rangeText(summer)}.`,
    },
    {
      question:
        "Wann sind die Herbstferien in Bremen 2027?",
      answer:
        `Die Herbstferien in Bremen 2027 dauern vom ${rangeText(autumn)}.`,
    },
    {
      question:
        "Wann sind die Weihnachtsferien in Bremen 2027?",
      answer:
        `Die Weihnachtsferien beginnen am ${christmas ? formatDate(christmas.startDate) : "nicht angegeben"} und enden am ${christmas ? formatDate(christmas.endDate) : "nicht angegeben"}.`,
    },
    {
      question:
        "Wie wird der bewegliche Ferientag in Bremen festgelegt?",
      answer:
        "Im Schuljahr 2026/27 gibt es einen beweglichen Ferientag. Die Schulkonferenz legt den Termin vor Beginn des Schuljahres für die jeweilige Schule fest. Erfolgt keine fristgerechte Festlegung, gilt laut Ferienverordnung Freitag, der 7. Mai 2027. Schulabhängige Alternativtermine werden von Schulferienklar nicht automatisch zusätzlich eingerechnet.",
    },
    {
      question:
        "Sind die unterrichtsfreien Samstage in Bremen enthalten?",
      answer:
        "Die Bremer Ferienverordnung führt unterrichtsfreie Samstage gesondert auf. Sie sind nicht als eigene Ferienereignisse im landesweiten Standarddatensatz enthalten. Für die bundesweit vergleichbare Berechnung behandelt Schulferienklar Samstag und Sonntag grundsätzlich als Wochenende; der konkrete Schulrhythmus kann deshalb abweichen.",
    },
    {
      question:
        "Können berufsbildende Schulen in Bremen abweichen?",
      answer:
        "Ja. Die Ferienverordnung erlaubt für berufsbildende Schulen oder einzelne berufliche Bildungsgänge Abweichungen bei den Halbjahresferien und beweglichen Ferientagen. Maßgeblich ist deshalb im Einzelfall die eigene Schule.",
    },
    {
      question:
        "Wie berechnet Schulferienklar die zusammenhängende freie Zeit?",
      answer:
        "Schulferienklar erweitert einen offiziellen Ferienzeitraum in der Standardberechnung um direkt angrenzende Samstage, Sonntage und landesweit geltende gesetzliche Feiertage. Schul- oder schulartspezifische Abweichungen werden nicht automatisch eingerechnet.",
    },
  ];
}

function bremen2027SpecialSectionHtml() {
  return `        <section
          id="besonderheiten"
          class="gold-section"
        >
          <p class="eyebrow">
            Wichtig für Bremen
          </p>

          <h2>
            Beweglicher Ferientag und Bremer Sonderregeln 2027
          </h2>

          <div class="gold-terminology-grid">
            <div>
              <h3>7. Mai und beweglicher Ferientag</h3>

              <p>
                Die zentrale Bremer Ferienübersicht
                führt
                <strong>Freitag, den
                7. Mai 2027</strong>,
                als
                <strong>Tag nach Himmelfahrt</strong>.
              </p>

              <p>
                Gleichzeitig bestimmt § 2 der
                Ferienverordnung für das Schuljahr
                2026/27
                <strong>einen beweglichen
                Ferientag</strong>.
                Den konkreten Termin legt die
                Schulkonferenz der jeweiligen Schule
                fest. Bei fehlender fristgerechter
                Festlegung gilt der 7. Mai 2027.
              </p>

              <p>
                Ein abweichender schulabhängiger
                Termin wird deshalb nicht automatisch
                zusätzlich in die landesweite
                Standardübersicht eingerechnet.
              </p>
            </div>

            <div>
              <h3>
                Unterrichtsfreie Samstage und
                berufliche Schulen
              </h3>

              <p>
                Die Bremer Ferienverordnung führt in
                § 3 zusätzlich konkrete
                <strong>unterrichtsfreie
                Samstage</strong>.
                Sie sind im Standarddatensatz nicht
                als eigene Ferienereignisse enthalten.
              </p>

              <p>
                Außerdem können
                <strong>berufsbildende Schulen</strong>
                nach § 6 bei Halbjahresferien und
                beweglichen Ferientagen abweichende
                Termine festlegen.
              </p>

              <p>
                Für einen konkreten Schulplan bleibt
                deshalb die Information der eigenen
                Schule maßgeblich.
              </p>
            </div>
          </div>

          <p class="gold-source-note">
            <strong>Pfingsten 2027:</strong>
            Die offizielle Ferienübersicht nennt
            Dienstag, den
            <strong>18. Mai 2027</strong>,
            als Ferientag zu Pfingsten.
          </p>
        </section>`;
}

function bremen2027RelatedLinksHtml() {
  return stateYearGoldRelatedLinksHtml([
    {
      href:
        "/schulferien-bremen-2026.html",
      label:
        "Schulferien Bremen 2026",
    },
    {
      href:
        "/schulferien-bremen-2028.html",
      label:
        "Schulferien Bremen 2028",
    },
    {
      href:
        "/schulferien-bremen.html",
      label:
        "Alle Jahre für Bremen",
    },
    {
      href:
        "/schulferien-2027.html",
      label:
        "Alle Bundesländer 2027",
    },
    {
      href:
        "/schulferien-niedersachsen-2027.html",
      label:
        "Niedersachsen 2027",
    },
    {
      href:
        "/schulferien-hamburg-2027.html",
      label:
        "Hamburg 2027",
    },
    {
      href:
        "/schulferien-schleswig-holstein-2027.html",
      label:
        "Schleswig-Holstein 2027",
    },
    {
      href:
        "/schulferien-mecklenburg-vorpommern-2027.html",
      label:
        "Mecklenburg-Vorpommern 2027",
    },
  ]);
}

function bremen2027GoldPageTemplate({
  slug,
  name,
  code,
  year,
  events,
}) {
  const faqItems =
    createBremen2027FaqItems(
      events,
    );

  return stateYearGoldPageTemplate({
    slug,
    name,
    code,
    year,
    events,
    title:
      "Schulferien Bremen 2027: Termine und freie Tage",
    description:
      "Schulferien Bremen 2027 mit Halbjahresferien, Osterferien, Himmelfahrt, Pfingsten, Sommerferien, beweglichen Ferientagen, PDF, ICS und offizieller Quelle.",
    marker:
      "bremen-2027",
    eyebrow:
      "Bremen · Kalenderjahr 2027",
    h1:
      "Schulferien Bremen 2027",
    introText:
      `Hier stehen zuerst die in der Bremer
Ferienübersicht veröffentlichten Termine. Zusätzlich
zeigt Schulferienklar, wie lange die freie Zeit in der
bundesweiten Standardberechnung direkt am Stück
dauert, wenn Wochenenden oder landesweite Feiertage
unmittelbar anschließen.`,
    specialNavLabel:
      "Bremen-Hinweise",
    termHeadingText:
      "Alle Ferienzeiten und schulfreien Tage in Bremen 2027",
    termIntroText:
      `Die Liste berücksichtigt auch Weihnachtsferien,
die aus 2026 in das Kalenderjahr 2027 hineinreichen
oder bis 2028 dauern. Außerdem sind die
Halbjahresferien, der Tag nach Himmelfahrt und der
einzelne Ferientag zu Pfingsten aufgeführt.`,
    renderPeriodRows:
      ({
        events,
        publicHolidays,
        year,
      }) => {
        return stateYearGoldPeriodRowsHtml({
          events,
          publicHolidays,
          year,
          getPeriodNote:
            getBremen2027PeriodNote,
        });
      },
    officialPeriodText:
      `Exakt der im hinterlegten Bremer Datensatz
veröffentlichte Beginn und das veröffentlichte Ende
des jeweiligen Ferienzeitraums beziehungsweise des
aufgeführten schulfreien Tages.`,
    connectedPeriodText:
      `Für die bundesweit einheitliche
Vergleichsberechnung wird der offizielle Zeitraum
um direkt anschließende Samstage, Sonntage und
landesweit geltende gesetzliche Feiertage erweitert.`,
    calculationNoteText:
      `Angegeben werden Kalendertage, nicht die Zahl
der ausgefallenen Unterrichtstage. Die Bremer
Ferienverordnung führt zusätzlich unterrichtsfreie
Samstage sowie schul- und schulartspezifische
Abweichungen auf. Diese werden in der
Standardberechnung nicht gesondert modelliert.`,
    specialSectionHtml:
      bremen2027SpecialSectionHtml(),
    sourceLinkLabel:
      "Ferienverordnung im Transparenzportal Bremen",
    secondaryLinkLabel:
      "Ferientermine des Senators für Kinder und Bildung",
    faqItems,
    relatedLinksHtml:
      bremen2027RelatedLinksHtml(),
    buttonText:
      "Bremen 2027 im Kalender öffnen",
  });
}



function getMecklenburgVorpommern2027DisplayName(event) {
  if (
    event.category ===
    "state_school_free_day"
  ) {
    return "Zusätzlicher feststehender Ferientag";
  }

  return getHolidayName(event);
}

function getMecklenburgVorpommern2027PeriodNote(event) {
  const crossingNote =
    getStateYearCrossingNote(
      event,
      2027,
    );

  if (crossingNote) {
    return crossingNote;
  }

  if (
    event.category ===
      "state_school_free_day" &&
    event.startDate ===
      "2027-05-07"
  ) {
    return (
      "Landesweit feststehender Ferientag für " +
      "allgemein bildende Schulen."
    );
  }

  return "";
}

function findMecklenburgVorpommern2027SchoolFreeDay(
  events,
) {
  return events.find((event) => {
    return (
      event.category ===
        "state_school_free_day" &&
      event.startDate ===
        "2027-05-07"
    );
  });
}

function createMecklenburgVorpommern2027FaqItems(
  events,
) {
  const winter =
    findStateYearGoldEvent(
      events,
      "winter",
      2027,
    );

  const easter =
    findStateYearGoldEvent(
      events,
      "easter",
      2027,
    );

  const pentecost =
    findStateYearGoldEvent(
      events,
      "pentecost",
      2027,
    );

  const summer =
    findStateYearGoldEvent(
      events,
      "summer",
      2027,
    );

  const autumn =
    findStateYearGoldEvent(
      events,
      "autumn",
      2027,
    );

  const christmas =
    findStateYearGoldEvent(
      events,
      "christmas",
      2027,
    );

  const schoolFreeDay =
    findMecklenburgVorpommern2027SchoolFreeDay(
      events,
    );

  const rangeText = (event) => {
    if (!event) {
      return (
        "Für diesen Zeitraum liegt " +
        "aktuell kein Eintrag vor."
      );
    }

    return (
      `${formatDate(event.startDate)} bis ` +
      `${formatDate(event.endDate)}`
    );
  };

  return [
    {
      question:
        "Wann sind die Winterferien in Mecklenburg-Vorpommern 2027?",
      answer:
        `Die Winterferien in Mecklenburg-Vorpommern 2027 dauern vom ${rangeText(winter)}.`,
    },
    {
      question:
        "Wann sind die Osterferien in Mecklenburg-Vorpommern 2027?",
      answer:
        `Die Osterferien in Mecklenburg-Vorpommern 2027 dauern vom ${rangeText(easter)}.`,
    },
    {
      question:
        "Ist der 7. Mai 2027 in Mecklenburg-Vorpommern schulfrei?",
      answer:
        `Ja. Freitag, der ${schoolFreeDay ? formatDate(schoolFreeDay.startDate) : "07.05.2027"}, ist für allgemein bildende Schulen als zusätzlicher feststehender Ferientag ausgewiesen.`,
    },
    {
      question:
        "Wann sind die Pfingstferien in Mecklenburg-Vorpommern 2027?",
      answer:
        `Die Pfingstferien in Mecklenburg-Vorpommern 2027 dauern vom ${rangeText(pentecost)}.`,
    },
    {
      question:
        "Wann sind die Sommerferien in Mecklenburg-Vorpommern 2027?",
      answer:
        `Die Sommerferien in Mecklenburg-Vorpommern 2027 dauern vom ${rangeText(summer)}.`,
    },
    {
      question:
        "Wann sind die Herbstferien in Mecklenburg-Vorpommern 2027?",
      answer:
        `Die Herbstferien im Schuljahr 2027/28 dauern vom ${rangeText(autumn)}.`,
    },
    {
      question:
        "Wann sind die Weihnachtsferien in Mecklenburg-Vorpommern 2027?",
      answer:
        `Die Weihnachtsferien beginnen am ${christmas ? formatDate(christmas.startDate) : "nicht angegeben"} und enden am ${christmas ? formatDate(christmas.endDate) : "nicht angegeben"}.`,
    },
    {
      question:
        "Gelten diese Termine auch für berufliche Schulen?",
      answer:
        "Nein. Mecklenburg-Vorpommern veröffentlicht für berufliche Schulen eigene Ferientermine. Diese Gold Page und der landesweite Standarddatensatz von Schulferienklar beziehen sich auf allgemein bildende Schulen.",
    },
    {
      question:
        "Was bedeutet zusätzlicher feststehender Ferientag?",
      answer:
        "Neben den regulären Ferienzeiträumen gibt es in Mecklenburg-Vorpommern zusätzliche landesweit festgelegte Ferientage für allgemein bildende Schulen. Im Schuljahr 2026/27 ist Freitag, der 7. Mai 2027, als solcher ausgewiesen.",
    },
    {
      question:
        "Wie berechnet Schulferienklar die zusammenhängende freie Zeit?",
      answer:
        "Schulferienklar erweitert einen offiziellen Ferienzeitraum um direkt angrenzende Samstage, Sonntage und landesweit geltende gesetzliche Feiertage. Termine beruflicher Schulen oder andere schulartspezifische Abweichungen werden nicht automatisch eingerechnet.",
    },
  ];
}

function mecklenburgVorpommern2027SpecialSectionHtml() {
  return `        <section
          id="besonderheiten"
          class="gold-section"
        >
          <p class="eyebrow">
            Wichtig für Mecklenburg-Vorpommern
          </p>

          <h2>
            Zusätzlicher Ferientag und unterschiedliche Schularten
          </h2>

          <div class="gold-terminology-grid">
            <div>
              <h3>
                7. Mai: zusätzlicher feststehender Ferientag
              </h3>

              <p>
                Für allgemein bildende Schulen ist
                <strong>Freitag, der
                7. Mai 2027</strong>,
                als zusätzlicher feststehender
                Ferientag ausgewiesen.
              </p>

              <p>
                Zusammen mit Christi Himmelfahrt am
                Donnerstag und dem anschließenden
                Wochenende entstehen
                <strong>4 freie Tage vom
                6. bis 9. Mai 2027</strong>.
              </p>
            </div>

            <div>
              <h3>
                Allgemein bildende und berufliche Schulen
              </h3>

              <p>
                Mecklenburg-Vorpommern veröffentlicht
                <strong>getrennte Ferienpläne</strong>
                für allgemein bildende und berufliche
                Schulen.
              </p>

              <p>
                Diese Seite zeigt die Termine der
                <strong>allgemein bildenden
                Schulen</strong>.
                Die teilweise abweichenden Ferien der
                beruflichen Schulen werden hier nicht
                automatisch eingerechnet.
              </p>
            </div>
          </div>

          <p class="gold-source-note">
            <strong>Pfingsten 2027:</strong>
            Die Pfingstferien dauern vom
            <strong>14. bis 18. Mai 2027</strong>.
            Da der Zeitraum Wochenende und
            Pfingstmontag bereits einschließt,
            ergeben sich
            <strong>5 zusammenhängende
            Kalendertage</strong>.
          </p>
        </section>`;
}

function mecklenburgVorpommern2027RelatedLinksHtml() {
  return stateYearGoldRelatedLinksHtml([
    {
      href:
        "/schulferien-mecklenburg-vorpommern-2026.html",
      label:
        "Schulferien Mecklenburg-Vorpommern 2026",
    },
    {
      href:
        "/schulferien-mecklenburg-vorpommern-2028.html",
      label:
        "Schulferien Mecklenburg-Vorpommern 2028",
    },
    {
      href:
        "/schulferien-mecklenburg-vorpommern.html",
      label:
        "Alle Jahre für Mecklenburg-Vorpommern",
    },
    {
      href:
        "/schulferien-2027.html",
      label:
        "Alle Bundesländer 2027",
    },
    {
      href:
        "/schulferien-schleswig-holstein-2027.html",
      label:
        "Schleswig-Holstein 2027",
    },
    {
      href:
        "/schulferien-hamburg-2027.html",
      label:
        "Hamburg 2027",
    },
    {
      href:
        "/schulferien-brandenburg-2027.html",
      label:
        "Brandenburg 2027",
    },
    {
      href:
        "/schulferien-berlin-2027.html",
      label:
        "Berlin 2027",
    },
  ]);
}

function mecklenburgVorpommern2027GoldPageTemplate({
  slug,
  name,
  code,
  year,
  events,
}) {
  const faqItems =
    createMecklenburgVorpommern2027FaqItems(
      events,
    );

  return stateYearGoldPageTemplate({
    slug,
    name,
    code,
    year,
    events,
    title:
      "Schulferien Mecklenburg-Vorpommern 2027: Termine und freie Tage",
    description:
      "Schulferien Mecklenburg-Vorpommern 2027 mit Winterferien, Osterferien, zusätzlichem Ferientag, Pfingstferien, Sommerferien, PDF, ICS und offizieller Quelle.",
    marker:
      "mecklenburg-vorpommern-2027",
    eyebrow:
      "Mecklenburg-Vorpommern · Kalenderjahr 2027",
    h1:
      "Schulferien Mecklenburg-Vorpommern 2027",
    introText:
      `Hier stehen zuerst die landesweit festgelegten
Ferientermine für allgemein bildende Schulen.
Zusätzlich zeigt Schulferienklar, wie lange die
freie Zeit direkt am Stück dauert, wenn Wochenenden
oder landesweite Feiertage unmittelbar anschließen.`,
    specialNavLabel:
      "MV-Hinweise",
    termHeadingText:
      "Alle Ferienzeiten und schulfreien Tage in Mecklenburg-Vorpommern 2027",
    termIntroText:
      `Die Liste berücksichtigt auch Weihnachtsferien,
die aus 2026 in das Kalenderjahr 2027 hineinreichen
oder bis 2028 dauern. Zusätzlich enthält sie den
feststehenden Ferientag am 7. Mai 2027. Die Termine
beziehen sich auf allgemein bildende Schulen.`,
    renderPeriodRows:
      ({
        events,
        publicHolidays,
        year,
      }) => {
        return stateYearGoldPeriodRowsHtml({
          events,
          publicHolidays,
          year,
          getDisplayName:
            getMecklenburgVorpommern2027DisplayName,
          getPeriodNote:
            getMecklenburgVorpommern2027PeriodNote,
        });
      },
    officialPeriodText:
      `Exakt der vom Ministerium für Bildung und
Kindertagesförderung veröffentlichte Beginn und das
veröffentlichte Ende des jeweiligen Ferienzeitraums
beziehungsweise des zusätzlichen feststehenden
Ferientages für allgemein bildende Schulen.`,
    connectedPeriodText:
      `Der offizielle Zeitraum plus direkt
anschließende Samstage, Sonntage und landesweit
geltende gesetzliche Feiertage.`,
    calculationNoteText:
      `Angegeben werden Kalendertage, nicht die Zahl
der ausgefallenen Unterrichtstage. Die teilweise
abweichenden Ferientermine beruflicher Schulen und
andere schulartspezifische Abweichungen werden nicht
automatisch eingerechnet.`,
    specialSectionHtml:
      mecklenburgVorpommern2027SpecialSectionHtml(),
    sourceLinkLabel:
      "Allgemeine Ferienverordnung Mecklenburg-Vorpommern",
    secondaryLinkLabel:
      "Ferientermine des Bildungsministeriums",
    faqItems,
    relatedLinksHtml:
      mecklenburgVorpommern2027RelatedLinksHtml(),
    buttonText:
      "Mecklenburg-Vorpommern 2027 im Kalender öffnen",
  });
}



function getSaarland2027PeriodNote(event) {
  const crossingNote =
    getStateYearCrossingNote(
      event,
      2027,
    );

  if (crossingNote) {
    return crossingNote;
  }

  if (event.type === "winter") {
    return (
      "Die offizielle Bezeichnung im Saarland " +
      "lautet Fastnachtsferien."
    );
  }

  return "";
}

function createSaarland2027FaqItems(
  events,
) {
  const winter =
    findStateYearGoldEvent(
      events,
      "winter",
      2027,
    );

  const easter =
    findStateYearGoldEvent(
      events,
      "easter",
      2027,
    );

  const summer =
    findStateYearGoldEvent(
      events,
      "summer",
      2027,
    );

  const autumn =
    findStateYearGoldEvent(
      events,
      "autumn",
      2027,
    );

  const christmas =
    findStateYearGoldEvent(
      events,
      "christmas",
      2027,
    );

  const rangeText = (event) => {
    if (!event) {
      return "aktuell kein Eintrag";
    }

    return (
      `${formatDate(event.startDate)} bis ` +
      `${formatDate(event.endDate)}`
    );
  };

  return [
    {
      question:
        "Wann sind die Fastnachtsferien im Saarland 2027?",
      answer:
        `Die Fastnachtsferien im Saarland 2027 dauern vom ${rangeText(winter)}.`,
    },
    {
      question:
        "Warum heißen die Winterferien im Saarland Fastnachtsferien?",
      answer:
        "Das Saarland führt diesen Ferienabschnitt in seiner Ferienordnung als Fastnachtsferien. Schulferienklar übernimmt diese offizielle Bezeichnung.",
    },
    {
      question:
        "Wann sind die Osterferien im Saarland 2027?",
      answer:
        `Die Osterferien im Saarland 2027 dauern vom ${rangeText(easter)}.`,
    },
    {
      question:
        "Gibt es im Saarland 2027 Pfingstferien?",
      answer:
        "Nein. Für die Schuljahre 2026/27 und 2027/28 sind im Saarland keine eigenen Pfingstferien ausgewiesen. Gesetzliche Feiertage wie Pfingstmontag bleiben davon unberührt.",
    },
    {
      question:
        "Wann sind die Sommerferien im Saarland 2027?",
      answer:
        `Die Sommerferien im Saarland 2027 dauern vom ${rangeText(summer)}.`,
    },
    {
      question:
        "Wann sind die Herbstferien im Saarland 2027?",
      answer:
        `Die Herbstferien im Schuljahr 2027/28 dauern vom ${rangeText(autumn)}.`,
    },
    {
      question:
        "Wann sind die Weihnachtsferien im Saarland 2027?",
      answer:
        `Die Weihnachtsferien im Schuljahr 2027/28 dauern vom ${rangeText(christmas)}.`,
    },
    {
      question:
        "Wie viele bewegliche Ferientage gibt es im Saarland?",
      answer:
        "Im Schuljahr 2026/27 stehen zwei bewegliche Ferientage zur Verfügung, im Schuljahr 2027/28 einer. Die konkreten Termine werden von der jeweiligen Schule beziehungsweise Schulkonferenz festgelegt und deshalb von Schulferienklar nicht automatisch in den landesweiten Standardkalender aufgenommen.",
    },
    {
      question:
        "Sind die beweglichen Ferientage in dieser Übersicht enthalten?",
      answer:
        "Nein. Da die konkreten Daten schulabhängig sind, zeigt diese Seite nur die landesweit festgelegten Ferienzeiten. Für bewegliche Ferientage ist die eigene Schule maßgeblich.",
    },
    {
      question:
        "Wie berechnet Schulferienklar die zusammenhängende freie Zeit?",
      answer:
        "Schulferienklar erweitert einen offiziellen Ferienzeitraum um direkt angrenzende Samstage, Sonntage und landesweit geltende gesetzliche Feiertage. Schulabhängige bewegliche Ferientage werden nicht automatisch eingerechnet.",
    },
  ];
}

function saarland2027SpecialSectionHtml() {
  return `        <section
          id="besonderheiten"
          class="gold-section"
        >
          <p class="eyebrow">
            Wichtig für das Saarland
          </p>

          <h2>
            Fastnachtsferien und bewegliche Ferientage 2027
          </h2>

          <div class="gold-terminology-grid">
            <div>
              <h3>
                Fastnachtsferien statt Winterferien
              </h3>

              <p>
                Der Ferienabschnitt im Februar heißt
                im Saarland offiziell
                <strong>Fastnachtsferien</strong>.
                2027 dauern sie vom
                <strong>8. bis 12. Februar</strong>.
              </p>

              <p>
                Mit den angrenzenden Wochenenden
                ergeben sich nach der
                Schulferienklar-Standardberechnung
                <strong>9 zusammenhängende freie
                Kalendertage vom 6. bis
                14. Februar 2027</strong>.
              </p>
            </div>

            <div>
              <h3>
                Bewegliche Ferientage sind schulabhängig
              </h3>

              <p>
                Im Schuljahr
                <strong>2026/27 gibt es zwei</strong>
                bewegliche Ferientage.
                Im Schuljahr
                <strong>2027/28 gibt es einen</strong>.
              </p>

              <p>
                Die konkreten Termine werden
                schulbezogen festgelegt.
                Deshalb werden sie im landesweiten
                Standardkalender von Schulferienklar
                <strong>nicht automatisch
                eingerechnet</strong>.
              </p>
            </div>
          </div>

          <p class="gold-source-note">
            <strong>Keine eigenen Pfingstferien 2027:</strong>
            Für die Schuljahre 2026/27 und 2027/28
            ist im Saarland kein eigener
            Pfingstferien-Zeitraum ausgewiesen.
            Gesetzliche Feiertage wie Christi Himmelfahrt,
            Pfingstmontag und Fronleichnam werden bei der
            Berechnung angrenzender freier Tage weiterhin
            berücksichtigt.
          </p>
        </section>`;
}

function saarland2027RelatedLinksHtml() {
  return stateYearGoldRelatedLinksHtml([
    {
      href:
        "/schulferien-saarland-2026.html",
      label:
        "Schulferien Saarland 2026",
    },
    {
      href:
        "/schulferien-saarland-2028.html",
      label:
        "Schulferien Saarland 2028",
    },
    {
      href:
        "/schulferien-saarland.html",
      label:
        "Alle Jahre für das Saarland",
    },
    {
      href:
        "/schulferien-2027.html",
      label:
        "Alle Bundesländer 2027",
    },
    {
      href:
        "/schulferien-rheinland-pfalz-2027.html",
      label:
        "Rheinland-Pfalz 2027",
    },
    {
      href:
        "/schulferien-hessen-2027.html",
      label:
        "Hessen 2027",
    },
    {
      href:
        "/schulferien-baden-wuerttemberg-2027.html",
      label:
        "Baden-Württemberg 2027",
    },
    {
      href:
        "/schulferien-nordrhein-westfalen-2027.html",
      label:
        "Nordrhein-Westfalen 2027",
    },
  ]);
}

function saarland2027GoldPageTemplate({
  slug,
  name,
  code,
  year,
  events,
}) {
  const faqItems =
    createSaarland2027FaqItems(
      events,
    );

  return stateYearGoldPageTemplate({
    slug,
    name,
    code,
    year,
    events,
    title:
      "Schulferien Saarland 2027: Termine und freie Tage",
    description:
      "Schulferien Saarland 2027 mit Fastnachtsferien, Osterferien, Sommerferien, beweglichen Ferientagen, PDF, ICS und offizieller Quelle.",
    marker:
      "saarland-2027",
    eyebrow:
      "Saarland · Kalenderjahr 2027",
    h1:
      "Schulferien Saarland 2027",
    introText:
      `Hier stehen zuerst die landesweit festgelegten
Ferientermine des Saarlandes. Zusätzlich zeigt
Schulferienklar, wie lange die freie Zeit direkt am
Stück dauert, wenn Wochenenden oder landesweite
Feiertage unmittelbar anschließen.`,
    specialNavLabel:
      "Saarland-Hinweise",
    termHeadingText:
      "Alle Ferienzeiten im Saarland 2027",
    termIntroText:
      `Die Liste zeigt die landesweit festgelegten
Ferienzeiten, die in das Kalenderjahr 2027 fallen.
Dazu gehören auch die Herbst- und Weihnachtsferien
des Schuljahres 2027/28. Schulabhängige bewegliche
Ferientage werden nicht als landesweit feste Termine
eingetragen.`,
    renderPeriodRows:
      ({
        events,
        publicHolidays,
        year,
      }) => {
        return stateYearGoldPeriodRowsHtml({
          events,
          publicHolidays,
          year,
          getPeriodNote:
            getSaarland2027PeriodNote,
        });
      },
    officialPeriodText:
      `Exakt der vom Ministerium für Bildung und Kultur
veröffentlichte Beginn und das veröffentlichte Ende
des jeweiligen landesweit festgelegten
Ferienzeitraums.`,
    connectedPeriodText:
      `Der offizielle Zeitraum plus direkt
anschließende Samstage, Sonntage und landesweit
geltende gesetzliche Feiertage.`,
    calculationNoteText:
      `Angegeben werden Kalendertage, nicht die Zahl
der ausgefallenen Unterrichtstage. Schulabhängige
bewegliche Ferientage werden nicht automatisch
eingerechnet.`,
    specialSectionHtml:
      saarland2027SpecialSectionHtml(),
    sourceLinkLabel:
      "Ferienordnung des Ministeriums für Bildung und Kultur",
    secondaryLinkLabel:
      "Ferienübersicht der Kultusministerkonferenz",
    faqItems,
    relatedLinksHtml:
      saarland2027RelatedLinksHtml(),
    buttonText:
      "Saarland 2027 im Kalender öffnen",
  });
}



function getSchleswigHolstein2027DisplayName(
  event,
) {
  if (
    event.category ===
      "state_school_free_day" &&
    event.type === "ascension"
  ) {
    return "Himmelfahrt (Ferientag am 7. Mai)";
  }

  return getHolidayName(event);
}

function getSchleswigHolstein2027PeriodNote(
  event,
) {
  const crossingNote =
    getStateYearCrossingNote(
      event,
      2027,
    );

  if (crossingNote) {
    return crossingNote;
  }

  if (
    event.category ===
      "state_school_free_day" &&
    event.type === "ascension"
  ) {
    return (
      "Der offizielle Ferientag liegt am " +
      "Freitag nach Christi Himmelfahrt."
    );
  }

  if (event.type === "easter") {
    return (
      "Die offizielle Bezeichnung lautet " +
      "Frühjahr/Ostern."
    );
  }

  return "";
}

function findSchleswigHolstein2027SchoolFreeDay(
  events,
) {
  return events.find((event) => {
    return (
      event.category ===
        "state_school_free_day" &&
      event.startDate === "2027-05-07"
    );
  });
}

function createSchleswigHolstein2027FaqItems(
  events,
) {
  const easter =
    findStateYearGoldEvent(
      events,
      "easter",
      2027,
    );

  const summer =
    findStateYearGoldEvent(
      events,
      "summer",
      2027,
    );

  const autumn =
    findStateYearGoldEvent(
      events,
      "autumn",
      2027,
    );

  const christmas =
    events.find((event) => {
      return (
        event.type === "christmas" &&
        event.startDate.startsWith("2027-")
      );
    });

  const schoolFree =
    findSchleswigHolstein2027SchoolFreeDay(
      events,
    );

  const rangeText = (event) => {
    if (!event) {
      return "aktuell kein Eintrag";
    }

    return (
      `${formatDate(event.startDate)} bis ` +
      `${formatDate(event.endDate)}`
    );
  };

  return [
    {
      question:
        "Wann sind die Osterferien in Schleswig-Holstein 2027?",
      answer:
        `Die offiziell als Frühjahr/Ostern bezeichneten Ferien dauern 2027 vom ${rangeText(easter)}.`,
    },
    {
      question:
        "Warum heißt der Ferienzeitraum Frühjahr/Ostern?",
      answer:
        "Schleswig-Holstein verwendet in der offiziellen Ferienverordnung die Bezeichnung Frühjahr/Ostern. Schulferienklar übernimmt diese Bezeichnung.",
    },
    {
      question:
        "Ist der 7. Mai 2027 in Schleswig-Holstein schulfrei?",
      answer:
        schoolFree
          ? "Ja. Freitag, der 07.05.2027, ist in der Ferienverordnung unter Himmelfahrt als Ferientag aufgeführt. Zusammen mit Christi Himmelfahrt am Donnerstag und dem Wochenende entstehen vier zusammenhängende freie Tage."
          : "Für den 7. Mai 2027 liegt aktuell kein landesweiter Eintrag vor.",
    },
    {
      question:
        "Wann sind die Sommerferien in Schleswig-Holstein 2027?",
      answer:
        `Die landesweiten Standardtermine der Sommerferien dauern vom ${rangeText(summer)}. Für Sylt, Föhr, Amrum, Helgoland und die Halligen gelten abweichende Regelungen.`,
    },
    {
      question:
        "Wann sind die Herbstferien in Schleswig-Holstein 2027?",
      answer:
        `Die landesweiten Standardtermine der Herbstferien dauern vom ${rangeText(autumn)}. Auf Sylt, Föhr, Amrum, Helgoland und den Halligen beginnen die Herbstferien eine Woche früher.`,
    },
    {
      question:
        "Welche Ferienregelung gilt auf Sylt, Föhr, Amrum, Helgoland und den Halligen?",
      answer:
        "Dort enden die Sommerferien grundsätzlich eine Woche früher und die Herbstferien beginnen eine Woche früher als nach der landesweiten Standardtabelle. Diese regionalen Abweichungen werden im Standardkalender von Schulferienklar nicht automatisch eingerechnet.",
    },
    {
      question:
        "Wie viele bewegliche Ferientage gibt es in Schleswig-Holstein?",
      answer:
        "Im Schuljahr 2026/27 gibt es zwei bewegliche Ferientage und im Schuljahr 2027/28 einen. Die konkreten Termine werden grundsätzlich von der Schulkonferenz nach Abstimmung festgelegt.",
    },
    {
      question:
        "Sind der 1. und 2. Februar 2027 automatisch schulfrei?",
      answer:
        "Nein. Der 1. und 2. Februar 2027 sind nur die in der Ferienverordnung vorgesehenen Ersatztermine für die zwei beweglichen Ferientage des Schuljahres 2026/27, falls keine rechtzeitige Einigung über andere Termine erzielt wird. Deshalb werden sie nicht als landesweite Standardtermine eingetragen.",
    },
    {
      question:
        "Wann sind die Weihnachtsferien in Schleswig-Holstein 2027?",
      answer:
        `Die Weihnachtsferien des Schuljahres 2027/28 dauern vom ${rangeText(christmas)}.`,
    },
    {
      question:
        "Wie berechnet Schulferienklar die zusammenhängende freie Zeit?",
      answer:
        "Schulferienklar erweitert einen offiziellen landesweiten Ferienzeitraum um direkt angrenzende Samstage, Sonntage und landesweit geltende gesetzliche Feiertage. Regionale Insel- und Hallig-Regelungen, bewegliche Ferientage sowie schulbezogene Abweichungen werden nicht automatisch eingerechnet.",
    },
  ];
}

function schleswigHolstein2027SpecialSectionHtml() {
  return `        <section
          id="besonderheiten"
          class="gold-section"
        >
          <p class="eyebrow">
            Wichtig für Schleswig-Holstein
          </p>

          <h2>
            Himmelfahrt, Inselregelungen und bewegliche Ferientage
          </h2>

          <div class="gold-terminology-grid">
            <div>
              <h3>
                7. Mai 2027: Ferientag zu Himmelfahrt
              </h3>

              <p>
                In der offiziellen Ferienverordnung
                steht für
                <strong>Freitag, den 7. Mai 2027</strong>,
                ein Ferientag unter
                <strong>Himmelfahrt</strong>.
              </p>

              <p>
                Christi Himmelfahrt ist bereits
                Donnerstag, der 6. Mai.
                Zusammen mit Freitag und Wochenende
                entstehen dadurch
                <strong>4 freie Tage vom
                6. bis 9. Mai 2027</strong>.
              </p>
            </div>

            <div>
              <h3>
                Sonderregelung für Inseln und Halligen
              </h3>

              <p>
                Für
                <strong>Sylt, Föhr, Amrum,
                Helgoland und die Halligen</strong>
                gilt eine abweichende Ferienregelung.
              </p>

              <p>
                Dort enden die Sommerferien
                grundsätzlich
                <strong>eine Woche früher</strong>
                und die Herbstferien beginnen
                <strong>eine Woche früher</strong>.
                Diese regionalen Termine werden
                im landesweiten Standardkalender
                nicht automatisch eingerechnet.
              </p>
            </div>
          </div>

          <p class="gold-source-note">
            <strong>Bewegliche Ferientage:</strong>
            Im Schuljahr 2026/27 gibt es zwei,
            im Schuljahr 2027/28 einen.
            Die Schulkonferenz legt die konkreten
            Termine nach Abstimmung fest.
            Nur wenn keine rechtzeitige Einigung
            zustande kommt, sieht die Verordnung
            für 2026/27 den
            <strong>1. und 2. Februar 2027</strong>
            als Ersatztermine vor.
            Sie werden deshalb nicht als
            landesweit feste Ferientage
            in Schulferienklar eingetragen.
          </p>

          <p class="gold-source-note">
            <strong>Weitere schulbezogene Abweichungen:</strong>
            Für berufsbildende Schulen und
            Landesförderzentren mit Internat können
            durch Beschluss der Schulkonferenz
            abweichende Ferien festgelegt werden.
            Diese Seite zeigt die landesweite
            Standardregelung.
          </p>
        </section>`;
}

function schleswigHolstein2027RelatedLinksHtml() {
  return stateYearGoldRelatedLinksHtml([
    {
      href:
        "/schulferien-schleswig-holstein-2026.html",
      label:
        "Schulferien Schleswig-Holstein 2026",
    },
    {
      href:
        "/schulferien-schleswig-holstein-2028.html",
      label:
        "Schulferien Schleswig-Holstein 2028",
    },
    {
      href:
        "/schulferien-schleswig-holstein.html",
      label:
        "Alle Jahre für Schleswig-Holstein",
    },
    {
      href:
        "/schulferien-2027.html",
      label:
        "Alle Bundesländer 2027",
    },
    {
      href:
        "/schulferien-hamburg-2027.html",
      label:
        "Hamburg 2027",
    },
    {
      href:
        "/schulferien-mecklenburg-vorpommern-2027.html",
      label:
        "Mecklenburg-Vorpommern 2027",
    },
    {
      href:
        "/schulferien-niedersachsen-2027.html",
      label:
        "Niedersachsen 2027",
    },
    {
      href:
        "/schulferien-bremen-2027.html",
      label:
        "Bremen 2027",
    },
  ]);
}

function schleswigHolstein2027GoldPageTemplate({
  slug,
  name,
  code,
  year,
  events,
}) {
  const faqItems =
    createSchleswigHolstein2027FaqItems(
      events,
    );

  return stateYearGoldPageTemplate({
    slug,
    name,
    code,
    year,
    events,
    title:
      "Schulferien Schleswig-Holstein 2027: Termine und freie Tage",
    description:
      "Schulferien Schleswig-Holstein 2027 mit Frühjahr/Ostern, Himmelfahrt, Sommerferien, Inselregelungen, PDF, ICS und offizieller Quelle.",
    marker:
      "schleswig-holstein-2027",
    eyebrow:
      "Schleswig-Holstein · Kalenderjahr 2027",
    h1:
      "Schulferien Schleswig-Holstein 2027",
    introText:
      `Hier stehen zuerst die landesweit geltenden
Standardtermine Schleswig-Holsteins. Zusätzlich zeigt
Schulferienklar die zusammenhängende freie Zeit direkt
um Ferien, Wochenenden und landesweite Feiertage.
Regionale Sonderregeln und schulabhängige Termine
werden getrennt erklärt.`,
    specialNavLabel:
      "SH-Hinweise",
    termHeadingText:
      "Alle Ferien- und schulfreien Zeiten 2027",
    termIntroText:
      `Die Liste berücksichtigt die Weihnachtsferien
2026/27, Frühjahr/Ostern, den Ferientag zu Himmelfahrt,
Sommer- und Herbstferien sowie die Weihnachtsferien
2027/28. Die besonderen Regelungen für Sylt, Föhr,
Amrum, Helgoland und die Halligen sowie bewegliche
Ferientage sind nicht Teil der landesweiten
Standardtermine.`,
    renderPeriodRows:
      ({
        events,
        publicHolidays,
        year,
      }) => {
        return stateYearGoldPeriodRowsHtml({
          events,
          publicHolidays,
          year,
          getDisplayName:
            getSchleswigHolstein2027DisplayName,
          getPeriodNote:
            getSchleswigHolstein2027PeriodNote,
        });
      },
    officialPeriodText:
      `Exakt der in der Ferienverordnung
veröffentlichte erste und letzte Ferientag
der landesweiten Standardregelung.`,
    connectedPeriodText:
      `Der offizielle Zeitraum plus direkt
anschließende Samstage, Sonntage und
landesweit geltende gesetzliche Feiertage.`,
    calculationNoteText:
      `Angegeben werden Kalendertage.
Regionale Insel- und Hallig-Regelungen,
bewegliche Ferientage und schulbezogene
Abweichungen werden nicht automatisch
eingerechnet.`,
    specialSectionHtml:
      schleswigHolstein2027SpecialSectionHtml(),
    sourceLinkLabel:
      "Ferientermine und Ferienverordnung Schleswig-Holstein",
    secondaryLinkLabel:
      "",
    faqItems,
    relatedLinksHtml:
      schleswigHolstein2027RelatedLinksHtml(),
    buttonText:
      "Schleswig-Holstein 2027 im Kalender öffnen",
  });
}


function sharedSeoStyles() {
  return `    <link rel="stylesheet" href="/seo-pages.css" />
    <script defer src="/privacy-analytics.js"></script>`;
}


function stateYearInternalLinksHtml({ slug, name, year }) {
  const yearLinks = years
    .map((linkYear) => {
      return `            <li><a href="/schulferien-${slug}-${linkYear}.html">Schulferien ${escapeHtml(name)} ${linkYear}</a></li>`;
    })
    .join("\n");

  const stateLinks = states
    .map(([stateSlug, stateName]) => {
      return `            <li><a href="/schulferien-${stateSlug}-${year}.html">Schulferien ${escapeHtml(stateName)} ${year}</a></li>`;
    })
    .join("\n");

  return `        <h2>Weitere Ferienseiten</h2>

        <h3>Weitere Jahre für ${escapeHtml(name)}</h3>
        <ul class="holiday-summary-list seo-link-list">
${yearLinks}
        </ul>

        <h3>Andere Bundesländer ${year}</h3>
        <ul class="holiday-summary-list seo-link-list">
${stateLinks}
        </ul>

        <h3>Übersichten</h3>
        <ul class="holiday-summary-list seo-link-list">
          <li><a href="/schulferien-${slug}.html">Übersicht Schulferien ${escapeHtml(name)}</a></li>
          <li><a href="/schulferien-${year}.html">Übersicht Schulferien ${year} in Deutschland</a></li>
        </ul>`;
}



function dataTrustNoteHtml() {
  const generatedAt = holidayIndex.generatedAt
    ? formatDate(holidayIndex.generatedAt)
    : "nicht angegeben";

  return `        <div class="note">
          <strong>Letzte Aktualisierung:</strong> ${generatedAt}<br />
          <strong>Datenbasis:</strong> Schulferienklar nutzt die hinterlegten Ferien-Datensätze
          der Bundesländer. Für verbindliche Auskünfte sind die offiziellen Veröffentlichungen
          des jeweiligen Bundeslandes maßgeblich.
          <a href="/datenquellen.html">Mehr zu den Datenquellen</a>.
        </div>`;
}


function seoTopNavHtml({ appHref = "/" } = {}) {
  return `      <nav class="seo-top-nav" aria-label="Schulferienklar Navigation">
        <a class="seo-brand" href="/">Schulferienklar</a>
        <div class="seo-top-links">
          <a href="/">Startseite</a>
          <span>·</span>
          <a href="${appHref}">Kalender öffnen</a>
        </div>
      </nav>

`;
}

function seoFooterHtml() {
  return `      <footer class="seo-footer" aria-label="Weitere Informationen">
        <a href="/datenquellen.html">Datenquellen</a>
        <a href="/datenschutz.html">Datenschutz</a>
        <a href="/impressum.html">Impressum</a>
        <a href="/support.html">Support</a>
        <a href="/ueber-uns.html">Über uns</a>
      </footer>

`;
}


function schulferienklarIntroCardHtml({ appHref }) {
  return `        <section class="intro-card intro-card-visual" aria-label="Schulferienklar kurz erklärt">
          <a class="intro-card-image-link" href="${appHref}" aria-label="Kalender öffnen">
            <img
              src="/og-image.png"
              alt="Schulferienklar Kalenderansicht mit Ferien und Feiertagen"
              loading="eager"
              fetchpriority="high"
              decoding="async"
              width="1200"
              height="630"
            />
          </a>
          <div class="intro-card-footer">
            <div>
              <p class="intro-card-label">Schulferienklar kurz erklärt</p>
              <h2>Ferien und Feiertage schneller planen</h2>
              <p>
                Schulferienklar zeigt Ferien, Feiertage und freie Zeiten
                für alle Bundesländer in einer klaren Kalenderansicht.
              </p>
            </div>
            <a class="intro-card-link" href="${appHref}">
              Kalender öffnen
            </a>
          </div>
        </section>

`;
}

function widgetPromoHtml({ code, name }) {
  return `        <section
          class="widget-promo"
          id="widget"
          aria-label="Schulferien-Widget für ${escapeHtml(name)}"
        >
          <div>
            <p class="widget-promo-label">Kostenlos für Websites</p>
            <h2>Schulferien-Widget für ${escapeHtml(name)}</h2>
            <p>
              Zeige die nächsten Schulferien für ${escapeHtml(name)}
              automatisch auf deiner Website. Bundesland, Darstellung und
              Anzahl der Termine kannst du selbst auswählen.
            </p>
          </div>
          <div class="widget-promo-actions">
            <a
              class="widget-promo-link"
              href="/widget.html?state=${escapeHtml(code)}"
            >
              Widget für ${escapeHtml(name)} erstellen
            </a>
            <small>
              Ohne Werbung, Cookies im eingebetteten Widget oder Nutzerkonto.
            </small>
          </div>
        </section>

`;
}



const GOLD_PAGE_READY_YEARS =
  new Set([
    2028,
    2029,
  ]);


function getDefaultGoldMarker({
  slug,
  code,
  year,
}) {
  const legacyMarkerBase = {
    BW: "bw",
    NI: "ni",
    NW: "nrw",
  };

  const markerBase =
    legacyMarkerBase[code] ||
    slug;

  return `${markerBase}-${year}`;
}

function createDefaultStateYearGoldFaqItems({
  events,
  name,
  year,
}) {
  const nameCounts =
    new Map();

  for (const event of events) {
    const holidayName =
      getHolidayName(event);

    nameCounts.set(
      holidayName,
      (
        nameCounts.get(holidayName) ||
        0
      ) + 1,
    );
  }

  const eventItems =
    events.map((event) => {
      const holidayName =
        getHolidayName(event);

      const hasDuplicateName =
        nameCounts.get(
          holidayName,
        ) > 1;

      const questionLabel =
        hasDuplicateName
          ? (
              `${holidayName} ` +
              `(${formatDate(event.startDate)}–` +
              `${formatDate(event.endDate)})`
            )
          : holidayName;

      const isSingleDay =
        event.startDate ===
        event.endDate;

      const answer =
        isSingleDay
          ? (
              `Der offizielle Termin für ` +
              `„${holidayName}“ ist der ` +
              `${formatDate(event.startDate)}.`
            )
          : (
              `Der offizielle Zeitraum für ` +
              `„${holidayName}“ dauert vom ` +
              `${formatDate(event.startDate)} bis ` +
              `${formatDate(event.endDate)}.`
            );

      return {
        question:
          `Welche Termine gelten für „${questionLabel}“ ` +
          `in ${name} ${year}?`,
        answer,
      };
    });

  return [
    ...eventItems,
    {
      question:
        `Was bedeutet „zusammenhängend frei“ ` +
        `für ${name} ${year}?`,
      answer:
        `Schulferienklar erweitert einen offiziellen ` +
        `landesweiten Ferienzeitraum um direkt ` +
        `angrenzende Samstage, Sonntage und ` +
        `landesweit geltende gesetzliche Feiertage.`,
    },
    {
      question:
        `Sind schul- oder ortsspezifische freie Tage ` +
        `in ${name} automatisch enthalten?`,
      answer:
        `Nein. Schul- oder ortsspezifische ` +
        `Abweichungen, bewegliche Ferientage und ` +
        `andere nicht landesweit einheitliche Termine ` +
        `werden nicht automatisch eingerechnet. ` +
        `Maßgeblich bleibt die offizielle ` +
        `Veröffentlichung beziehungsweise die eigene Schule.`,
    },
  ];
}


function stateYearGoldPolicySectionHtml({
  dataset,
  events,
  name,
  year,
}) {
  const policy =
    dataset?.goldPagePolicy;

  const highlights =
    Array.isArray(
      policy?.highlights,
    )
      ? policy.highlights
      : [];

  if (
    !policy ||
    highlights.length === 0
  ) {
    return "";
  }

  const schoolFreeEvents =
    events.filter((event) => {
      return (
        event.category ===
          "state_school_free_day" ||
        event.category ===
          "school_free_day"
      );
    });

  const schoolFreeHtml =
    schoolFreeEvents.length > 0
      ? `          <div>
            <h3>Landesweit ausgewiesene schulfreie Tage</h3>
            <ul class="holiday-summary-list">
${schoolFreeEvents
  .map((event) => {
    const range =
      event.startDate ===
      event.endDate
        ? formatDate(
            event.startDate,
          )
        : (
            `${formatDate(event.startDate)} – ` +
            `${formatDate(event.endDate)}`
          );

    return (
      `              <li>` +
      `<strong>${escapeHtml(getHolidayName(event))}</strong>` +
      `<span>${range}</span>` +
      `</li>`
    );
  })
  .join("\n")}
            </ul>
          </div>`
      : "";

  const highlightsHtml =
    highlights
      .map((highlight) => {
        const paragraphs =
          Array.isArray(
            highlight.paragraphs,
          )
            ? highlight.paragraphs
            : [];

        return `            <div>
              <h3>${escapeHtml(highlight.title)}</h3>
${paragraphs
  .map((paragraph) => {
    return (
      `              <p>` +
      `${escapeHtml(paragraph)}` +
      `</p>`
    );
  })
  .join("\n")}
            </div>`;
      })
      .join("\n");

  return `        <section
          id="besonderheiten"
          class="gold-section"
        >
          <p class="eyebrow">
            ${escapeHtml(
              policy.eyebrow ||
              `Wichtig für ${name}`,
            )}
          </p>

          <h2>
            ${escapeHtml(
              policy.heading ||
              `Besonderheiten ${name} ${year}`,
            )}
          </h2>

          ${
            policy.intro
              ? `<p>${escapeHtml(policy.intro)}</p>`
              : ""
          }

${schoolFreeHtml}

          <div class="gold-terminology-grid">
${highlightsHtml}
          </div>

          ${
            policy.footerNote
              ? `<p class="gold-source-note">${escapeHtml(
                  policy.footerNote,
                )}</p>`
              : ""
          }
        </section>`;
}

function defaultStateYearGoldSpecialSectionHtml({
  events,
  name,
  year,
}) {
  const schoolFreeEvents =
    events.filter((event) => {
      return (
        event.category ===
          "state_school_free_day" ||
        event.category ===
          "school_free_day"
      );
    });

  const schoolFreeHtml =
    schoolFreeEvents.length > 0
      ? `          <ul class="holiday-summary-list">
${schoolFreeEvents
  .map((event) => {
    const range =
      event.startDate === event.endDate
        ? formatDate(event.startDate)
        : (
            `${formatDate(event.startDate)} – ` +
            `${formatDate(event.endDate)}`
          );

    return (
      `            <li>` +
      `<strong>${escapeHtml(getHolidayName(event))}</strong>` +
      `<span>${range}</span>` +
      `</li>`
    );
  })
  .join("\n")}
          </ul>`
      : `          <p>
            Der landesweite Standarddatensatz enthält für
            ${escapeHtml(name)} ${year} keine zusätzlich
            ausgewiesenen landesweiten schulfreien Tage
            außerhalb der erfassten Ferienzeiträume.
          </p>`;

  return `        <section
          id="besonderheiten"
          class="gold-section"
        >
          <p class="eyebrow">
            Hinweise für ${escapeHtml(name)}
          </p>

          <h2>
            Landesweite und schulbezogene Besonderheiten
          </h2>

          <p>
            Neben den regulären Ferien werden hier auch
            ausdrücklich landesweit ausgewiesene
            schulfreie Tage angezeigt, soweit sie im
            offiziellen Bundesland-Datensatz enthalten sind.
          </p>

${schoolFreeHtml}

          <p class="gold-source-note">
            <strong>Wichtig:</strong>
            Bewegliche Ferientage sowie schul-, orts- oder
            schulartspezifische Abweichungen werden nicht
            automatisch als landesweit freie Tage behandelt.
            Für solche Termine ist die eigene Schule
            beziehungsweise die offizielle Veröffentlichung
            maßgeblich.
          </p>
        </section>`;
}

function defaultStateYearGoldRelatedLinksHtml({
  slug,
  name,
  year,
}) {
  const links = [];

  if (years.includes(year - 1)) {
    links.push({
      href:
        `/schulferien-${slug}-${year - 1}.html`,
      label:
        `Schulferien ${name} ${year - 1}`,
    });
  }

  if (years.includes(year + 1)) {
    links.push({
      href:
        `/schulferien-${slug}-${year + 1}.html`,
      label:
        `Schulferien ${name} ${year + 1}`,
    });
  }

  links.push(
    {
      href:
        `/schulferien-${slug}.html`,
      label:
        `Alle Jahre für ${name}`,
    },
    {
      href:
        `/schulferien-${year}.html`,
      label:
        `Alle Bundesländer ${year}`,
    },
  );

  return stateYearGoldRelatedLinksHtml(
    links,
  );
}

function defaultStateYearGoldPageTemplate({
  slug,
  name,
  code,
  year,
  events,
}) {
  const faqItems =
    createDefaultStateYearGoldFaqItems({
      events,
      name,
      year,
    });

  const dataset =
    getSchoolHolidayDatasetForState({
      holidayIndex,
      code,
    });

  const policy =
    dataset?.goldPagePolicy ||
    null;

  const specialNavLabel =
    policy?.navLabel ||
    "Hinweise";

  const calculationNoteText =
    policy?.calculationNote ||
    `Angegeben werden Kalendertage.
Schul-, orts- oder schulartspezifische Abweichungen
und bewegliche Ferientage werden nicht automatisch
eingerechnet.`;

  const policySectionHtml =
    stateYearGoldPolicySectionHtml({
      dataset,
      events,
      name,
      year,
    });

  const specialSectionHtml =
    policySectionHtml ||
    defaultStateYearGoldSpecialSectionHtml({
      events,
      name,
      year,
    });

  return stateYearGoldPageTemplate({
    slug,
    name,
    code,
    year,
    events,
    title:
      `Schulferien ${name} ${year}: Termine und freie Tage`,
    description:
      `Schulferien ${name} ${year} mit allen landesweit ` +
      `erfassten Terminen, zusammenhängender freier Zeit, ` +
      `Jahreskalender, PDF, ICS und offizieller Quelle.`,
    marker:
      getDefaultGoldMarker({
        slug,
        code,
        year,
      }),
    eyebrow:
      `${name} · Kalenderjahr ${year}`,
    h1:
      `Schulferien ${name} ${year}`,
    introText:
      `Hier findest du die landesweit erfassten
Schulferien und schulfreien Tage für ${name} ${year}.
Zusätzlich zeigt Schulferienklar die direkt
zusammenhängende freie Zeit rund um Wochenenden
und landesweit geltende Feiertage.`,
    specialNavLabel,
    termHeadingText:
      `Alle Ferien- und schulfreien Termine ${name} ${year}`,
    termIntroText:
      `Die Übersicht übernimmt alle landesweit im
Datensatz erfassten Termine, die das Kalenderjahr ${year}
berühren. Schul-, orts- oder schulartspezifische
Abweichungen werden nicht automatisch ergänzt.`,
    renderPeriodRows:
      ({
        events,
        publicHolidays,
        year,
      }) => {
        return stateYearGoldPeriodRowsHtml({
          events,
          publicHolidays,
          year,
        });
      },
    officialPeriodText:
      `Der im landesweiten Datensatz hinterlegte
offizielle erste und letzte Ferientag.`,
    connectedPeriodText:
      `Der offizielle Zeitraum plus direkt
angrenzende Samstage, Sonntage und landesweit
geltende gesetzliche Feiertage.`,
    calculationNoteText,
    specialSectionHtml,
    sourceLinkLabel:
      `Offizielle Ferientermine ${name}`,
    secondaryLinkLabel:
      "Weitere offizielle Quelle",
    faqItems,
    relatedLinksHtml:
      defaultStateYearGoldRelatedLinksHtml({
        slug,
        name,
        year,
      }),
    buttonText:
      `${name} ${year} im Kalender öffnen`,
  });
}


const GOLD_PAGE_TEMPLATES = new Map([
  [
    "BY-2027",
    bayern2027GoldPageTemplate,
  ],
  [
    "BE-2027",
    berlin2027GoldPageTemplate,
  ],
  [
    "BB-2027",
    brandenburg2027GoldPageTemplate,
  ],
  [
    "HB-2027",
    bremen2027GoldPageTemplate,
  ],
  [
    "MV-2027",
    mecklenburgVorpommern2027GoldPageTemplate,
  ],
  [
    "SL-2027",
    saarland2027GoldPageTemplate,
  ],
  [
    "SH-2027",
    schleswigHolstein2027GoldPageTemplate,
  ],
  [
    "HH-2027",
    hamburg2027GoldPageTemplate,
  ],
  [
    "HE-2027",
    hessen2027GoldPageTemplate,
  ],
  [
    "NI-2027",
    niedersachsen2027GoldPageTemplate,
  ],
  [
    "SN-2027",
    sachsen2027GoldPageTemplate,
  ],
  [
    "ST-2027",
    sachsenAnhalt2027GoldPageTemplate,
  ],
  [
    "TH-2027",
    thueringen2027GoldPageTemplate,
  ],
  [
    "NW-2027",
    nrw2027GoldPageTemplate,
  ],
  [
    "RP-2027",
    rheinlandPfalz2027GoldPageTemplate,
  ],
  [
    "BW-2027",
    bw2027GoldPageTemplate,
  ],
]);

function pageTemplate({
  slug,
  name,
  englishName,
  code,
  year,
  events,
}) {
  const goldPageTemplate =
    GOLD_PAGE_TEMPLATES.get(
      `${code}-${year}`,
    );

  if (goldPageTemplate) {
    return goldPageTemplate({
      slug,
      name,
      code,
      year,
      events,
    });
  }

  if (
    GOLD_PAGE_READY_YEARS.has(
      year,
    )
  ) {
    return defaultStateYearGoldPageTemplate({
      slug,
      name,
      code,
      year,
      events,
    });
  }

  const title = `Schulferien ${name} ${year} – Schulferienklar`;
  const description = `Schulferien ${name} ${year}: Ferien, Feiertage und freie Zeiten im Kalender sehen. School holidays ${englishName} ${year}.`;

  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta
      name="keywords"
      content="Schulferien ${name} ${year}, Ferien ${name} ${year}, Feiertage ${name} ${year}, school holidays ${englishName} ${year}, school holidays Germany ${year}"
    />
    <link rel="canonical" href="https://www.schulferienklar.de/schulferien-${slug}-${year}.html" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="https://www.schulferienklar.de/schulferien-${slug}-${year}.html" />
    <meta property="og:image" content="https://www.schulferienklar.de/og-image.png" />
    ${sharedSeoStyles()}
  </head>
  <body class="seo-page">
    <main>
${seoTopNavHtml({ appHref: `/?state=${code}&year=${year}` })}      <section class="card">
        <p class="eyebrow">Schulferien ${year}</p>
        <h1>Schulferien ${name} ${year}</h1>

        <p>
          Schulferienklar zeigt Schulferien, gesetzliche Feiertage und freie Zeiten
          für ${name} übersichtlich im Kalender.
        </p>

${schulferienklarIntroCardHtml({
  appHref: `/?state=${code}&year=${year}`,
})}
${stateYearQuickSummaryHtml(events, name, year)}
${stateYearQueryIntroHtml(name, year, events)}

        <h2>Kalender ${name} ${year}</h2>
        <p>
          Der kostenlose Kalender zeigt Schulferien, Feiertage und freie Zeiten
          für ${name} ${year}. So kannst du Ferien, Brückentage und längere
          freie Zeiträume schneller vergleichen.
        </p>

        <p>
          Die App hilft Familien, Schüler:innen und allen, die Betreuung, Reisen,
          Lernzeiten oder freie Tage rund um die Schulferien planen möchten.
        </p>

${jahreskalenderHtml({ slug, name, code, year })}
${widgetPromoHtml({ code, name })}
${stateYearInternalLinksHtml({ slug, name, year })}

        <h2>School holidays ${englishName} ${year}</h2>
        <p>
          English note: Schulferienklar helps international residents in Germany
          check school holidays, public holidays and connected free days by federal state.
        </p>
        <p>
          Planning a trip to Germany? School holidays and public holidays can affect
          trains, hotels and popular attractions, especially during busy family travel periods.
        </p>
        <p>
          <a href="/germany-travel-checker.html">Check your Germany travel dates</a>
          before booking your trip.
        </p>

        <a class="button" href="/?state=${code}&year=${year}">Kalender öffnen</a>

${dataTrustNoteHtml()}
      </section>
${seoFooterHtml()}    </main>
  </body>
</html>`;
}


function stateHubTemplate({ holidayIndex, slug, name, englishName, code }) {
  const title = `Schulferien ${name} – Termine, Feiertage und Kalender`;
  const description = `Schulferien in ${name}: aktuelle Ferientermine, Feiertage und freie Tage für die nächsten Jahre übersichtlich im Kalender.`;


  const yearSummaryCards = years
    .map((year) => {
      const events = getEventsForStateAndYear({ holidayIndex, code, year });
      const firstEvent =
        events.find((event) => event.startDate >= `${year}-01-01`) || events[0];
      const firstEventText = firstEvent
        ? `${escapeHtml(getHolidayName(firstEvent))}: ${formatDate(firstEvent.startDate)} bis ${formatDate(firstEvent.endDate)}`
        : "Noch keine Ferientermine verfügbar";

      return `          <li>
            <strong><a href="/schulferien-${slug}-${year}.html">Schulferien ${escapeHtml(name)} ${year}</a></strong>
            <span>${events.length} Ferienzeiträume · ${firstEventText}</span>
          </li>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="https://www.schulferienklar.de/schulferien-${slug}.html" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="https://www.schulferienklar.de/schulferien-${slug}.html" />
    <meta property="og:image" content="https://www.schulferienklar.de/og-image.png" />
    ${sharedSeoStyles()}
  </head>
  <body class="seo-page">
    <main>
${seoTopNavHtml({ appHref: `/?state=${code}` })}      <section class="card">
        <p class="eyebrow">Bundesland</p>
        <h1>Schulferien ${escapeHtml(name)}</h1>

        <p>
          Hier findest du die Schulferien, Feiertage und freien Zeiten in
          ${escapeHtml(name)} für die nächsten Jahre.
        </p>

${schulferienklarIntroCardHtml({
  appHref: `/?state=${code}`,
})}
        <h2>Übersicht ${escapeHtml(name)} ${years[0]}–${years[years.length - 1]}</h2>
        <p>
          Die folgenden Jahresseiten zeigen die Ferientermine für ${escapeHtml(name)}
          mit Ferienzeiträumen, Feiertagen und direktem Kalenderzugang.
        </p>

        <h2>Schulferien ${escapeHtml(name)} nach Jahr</h2>
        <p>
          Wähle ein Jahr, um die Schulferien ${escapeHtml(name)} ${years[0]} bis ${years[years.length - 1]} einzeln zu prüfen.
          Besonders gesucht sind Jahresübersichten wie Ferien ${escapeHtml(name)} ${years[1]}, Schulferien ${escapeHtml(name)} ${years[1]} und Kalender ${escapeHtml(name)} ${years[1]}.
        </p>
        <p>
          Die Jahresseiten zeigen auch wichtige Ferienzeiten wie Sommerferien ${escapeHtml(name)}, Osterferien, Pfingstferien, Herbstferien und Weihnachtsferien, soweit sie für das jeweilige Jahr verfügbar sind.
        </p>

        <ul class="holiday-summary-list">
${yearSummaryCards}
        </ul>

        <h2>Reiseplanung auf Englisch</h2>
        <p>
          Ferienzeiten können die Nachfrage nach Hotels, Zügen und beliebten
          Ausflugszielen erhöhen. Für eine englischsprachige Reiseplanung gibt es
          den Germany Travel Checker.
        </p>
        <p>
          <a href="/germany-travel-checker.html">Germany Travel Checker öffnen</a>
        </p>

        <p>
          Schulferienklar hilft bei der Planung von Betreuung, Reisen, Lernzeiten
          und freien Tagen rund um die Ferien in ${escapeHtml(name)}.
        </p>

        <a class="button" href="/?state=${code}">Kalender für ${escapeHtml(name)} öffnen</a>

${dataTrustNoteHtml()}
      </section>
${seoFooterHtml()}    </main>
  </body>
</html>`;
}

function yearHubTemplate({ holidayIndex, year }) {
  const title = `Schulferien ${year} in Deutschland – alle Bundesländer`;
  const description = `Schulferien ${year} in Deutschland: Ferientermine der Bundesländer übersichtlich vergleichen und freie Tage besser planen.`;


  const stateSummaryCards = states
    .map(([slug, name, _englishName, code]) => {
      const events = getEventsForStateAndYear({ holidayIndex, code, year });
      const firstEvent =
        events.find((event) => event.startDate >= `${year}-01-01`) || events[0];
      const firstEventText = firstEvent
        ? `${escapeHtml(getHolidayName(firstEvent))}: ${formatDate(firstEvent.startDate)} bis ${formatDate(firstEvent.endDate)}`
        : "Noch keine Ferientermine verfügbar";

      return `          <li>
            <strong><a href="/schulferien-${slug}-${year}.html">Schulferien ${escapeHtml(name)} ${year}</a></strong>
            <span>${events.length} Ferienzeiträume · ${firstEventText}</span>
          </li>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="https://www.schulferienklar.de/schulferien-${year}.html" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="https://www.schulferienklar.de/schulferien-${year}.html" />
    <meta property="og:image" content="https://www.schulferienklar.de/og-image.png" />
    ${sharedSeoStyles()}
  </head>
  <body class="seo-page">
    <main>
${seoTopNavHtml({ appHref: `/?year=${year}` })}      <section class="card">
        <p class="eyebrow">Deutschland</p>
        <h1>Schulferien ${year} in Deutschland</h1>

        <p>
          Vergleiche die Schulferien ${year} nach Bundesland und öffne die
          Detailseiten für Kalender, Feiertage und freie Zeiten.
        </p>

${schulferienklarIntroCardHtml({
  appHref: `/?year=${year}`,
})}
        <h2>Schulferien ${year} nach Bundesland</h2>
        <p>
          Diese Übersicht hilft dir, die Ferien ${year} in Deutschland nach Bundesland zu vergleichen.
          Besonders häufig gesucht werden Jahreskalender wie Ferien Bayern ${year}, Schulferien Hamburg ${year}
          oder Ferien Sachsen-Anhalt ${year}.
        </p>
        <p>
          Über die Detailseiten findest du Kalender ${year} mit Schulferien, gesetzlichen Feiertagen,
          Brückentagen und wichtigen Ferienzeiten wie Sommerferien, Osterferien, Herbstferien und Weihnachtsferien.
        </p>

        <h2>Übersicht der Bundesländer ${year}</h2>
        <p>
          Die folgenden Übersichten zeigen, wie viele Ferienzeiträume je
          Bundesland für ${year} vorliegen und welcher Ferienzeitraum zuerst
          im Jahr beginnt.
        </p>

        <ul class="holiday-summary-list">
${stateSummaryCards}
        </ul>

        <a class="button" href="/?year=${year}">Kalender ${year} öffnen</a>

${dataTrustNoteHtml()}
      </section>
${seoFooterHtml()}    </main>
  </body>
</html>`;
}


function sitemapEntry(url, { changefreq = "monthly", priority = "0.7", lastmod } = {}) {
  const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : "";

  return `  <url>
    <loc>https://www.schulferienklar.de${url}</loc>${lastmodTag}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

function writeSitemap() {
  const generatedAt = new Date().toISOString().slice(0, 10);

  const staticPages = [
    ["/", "weekly", "1.0"],
    ["/widget.html", "monthly", "0.7"],
    ...years.map((year) => [
      `/urlaubsplaner-${year}.html`,
      "monthly",
      "0.85",
    ]),
    ["/datenquellen.html", "monthly", "0.7"],
    ["/ueber-uns.html", "monthly", "0.6"],
    ["/impressum.html", "yearly", "0.3"],
    ["/datenschutz.html", "yearly", "0.3"],
    ["/support.html", "monthly", "0.4"],
    ["/travel-germany-school-holidays.html", "monthly", "0.6"],
    ["/germany-travel-checker.html", "monthly", "0.6"],
  ];

  const stateHubPages = states.map(([slug]) => {
    return [`/schulferien-${slug}.html`, "monthly", "0.75"];
  });

  const yearHubPages = years.map((year) => {
    return [`/schulferien-${year}.html`, "monthly", "0.75"];
  });

  const stateYearPages = years.flatMap((year) => {
    return states.map(([slug]) => {
      return [`/schulferien-${slug}-${year}.html`, "monthly", "0.8"];
    });
  });

  const entries = [
    ...staticPages,
    ...stateHubPages,
    ...yearHubPages,
    ...stateYearPages,
  ]
    .map(([url, changefreq, priority]) => {
      return sitemapEntry(url, { changefreq, priority, lastmod: generatedAt });
    })
    .join("\n");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;

  fs.writeFileSync(path.join(outputDir, "sitemap.xml"), sitemap, "utf8");
  console.log("created sitemap.xml");
}


const holidayIndex =
  nodeHolidayRepository.loadSchoolHolidayIndex();

const publicHolidayIndex =
  nodeHolidayRepository.loadPublicHolidayIndex();

for (const year of years) {
  for (const [slug, name, englishName, code] of states) {
    const fileName = `schulferien-${slug}-${year}.html`;
    const events = getEventsForStateAndYear({ holidayIndex, code, year });

    fs.writeFileSync(
      path.join(outputDir, fileName),
      cleanGeneratedHtml(
        pageTemplate({ slug, name, englishName, code, year, events })
      ),
      "utf8"
    );

    console.log(`created ${fileName} (${events.length} entries)`);
  }
}

for (const [slug, name, englishName, code] of states) {
  const fileName = `schulferien-${slug}.html`;

  fs.writeFileSync(
    path.join(outputDir, fileName),
    cleanGeneratedHtml(
      stateHubTemplate({ holidayIndex, slug, name, englishName, code })
    ),
    "utf8"
  );

  console.log(`created ${fileName}`);
}

for (const year of years) {
  const fileName = `schulferien-${year}.html`;

  fs.writeFileSync(
    path.join(outputDir, fileName),
    cleanGeneratedHtml(yearHubTemplate({ holidayIndex, year })),
    "utf8"
  );

  console.log(`created ${fileName}`);
}

writeSitemap();
