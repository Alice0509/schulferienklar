import fs from "node:fs";
import path from "node:path";

const outputDir = path.resolve("public");
const holidayDataDir = path.resolve("public/data/holidays");
const holidayIndexPath = path.join(holidayDataDir, "index.json");
const publicHolidayDataDir = path.resolve("public/data/public-holidays");
const publicHolidayIndexPath = path.join(publicHolidayDataDir, "index.json");

const years = [2026, 2027, 2028, 2029, 2030];

const states = [
  ["baden-wuerttemberg", "Baden-Württemberg", "Baden-Wuerttemberg", "BW"],
  ["bayern", "Bayern", "Bavaria", "BY"],
  ["berlin", "Berlin", "Berlin", "BE"],
  ["brandenburg", "Brandenburg", "Brandenburg", "BB"],
  ["bremen", "Bremen", "Bremen", "HB"],
  ["hamburg", "Hamburg", "Hamburg", "HH"],
  ["hessen", "Hessen", "Hesse", "HE"],
  ["mecklenburg-vorpommern", "Mecklenburg-Vorpommern", "Mecklenburg-Western Pomerania", "MV"],
  ["niedersachsen", "Niedersachsen", "Lower Saxony", "NI"],
  ["nordrhein-westfalen", "Nordrhein-Westfalen", "North Rhine-Westphalia", "NW"],
  ["rheinland-pfalz", "Rheinland-Pfalz", "Rhineland-Palatinate", "RP"],
  ["saarland", "Saarland", "Saarland", "SL"],
  ["sachsen", "Sachsen", "Saxony", "SN"],
  ["sachsen-anhalt", "Sachsen-Anhalt", "Saxony-Anhalt", "ST"],
  ["schleswig-holstein", "Schleswig-Holstein", "Schleswig-Holstein", "SH"],
  ["thueringen", "Thüringen", "Thuringia", "TH"],
];

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

  const datasetPath = path.join(holidayDataDir, dataset.jsonFile);
  const datasetJson = JSON.parse(fs.readFileSync(datasetPath, "utf8"));
  const events = datasetJson.holidays || datasetJson.events || [];

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

  const datasetPath = path.join(holidayDataDir, dataset.jsonFile);
  const datasetJson = JSON.parse(fs.readFileSync(datasetPath, "utf8"));

  return datasetJson.sources?.[0] || null;
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

  const datasetPath = path.join(publicHolidayDataDir, dataset.jsonFile);
  const datasetJson = JSON.parse(fs.readFileSync(datasetPath, "utf8"));

  return datasetJson.holidays || datasetJson.events || [];
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

function bayern2027PeriodRowsHtml(events, publicHolidays) {
  return events
    .map((event) => {
      const connectedPeriod = getConnectedFreePeriod(event, publicHolidays);
      const officialDayCount = daysInclusive(event.startDate, event.endDate);
      const periodNote = getBayern2027PeriodNote(event);
      const eventId = `termin-${String(event.id || event.type)
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")}`;

      return `            <li class="gold-period-row" id="${eventId}">
              <div class="gold-period-name">
                <strong>${escapeHtml(getBayern2027DisplayName(event))}</strong>
                ${
                  periodNote
                    ? `<small>${escapeHtml(periodNote)}</small>`
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

function findBayern2027Event(events, type) {
  return events.find((event) => {
    return event.type === type && event.startDate.startsWith("2027");
  });
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

function bayern2027FaqHtml(faqItems) {
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
          <h2>Häufige Fragen zu den Schulferien Bayern 2027</h2>
          <div class="gold-faq-list">
${items}
          </div>
        </section>`;
}

function bayern2027StructuredDataHtml(faqItems) {
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
            name: "Schulferien Bayern",
            item: "https://www.schulferienklar.de/schulferien-bayern.html",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Schulferien Bayern 2027",
            item: "https://www.schulferienklar.de/schulferien-bayern-2027.html",
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

  const json = JSON.stringify(data).replaceAll("<", "\\u003c");

  return `    <script type="application/ld+json">${json}</script>`;
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


function bayern2027JahreskalenderHtml() {
  return `        <section id="jahreskalender" class="gold-section gold-jahreskalender">
          <p class="eyebrow">Zwölf Monate auf einer Seite</p>
          <h2>Jahreskalender Bayern 2027</h2>
          <p>
            Öffne die vollständige Jahresansicht mit Kalenderwochen,
            Schulferien, Feiertagen und direkt zusammenhängender freier Zeit.
          </p>
          <div class="gold-jahreskalender-grid">
            <a
              class="gold-jahreskalender-card gold-jahreskalender-primary"
              href="/downloads/jahreskalender-bayern-2027.html"
              data-download-action="open-jahreskalender-bayern-2027"
            >
              <span>Jahresansicht · PDF</span>
              <strong>Jahreskalender öffnen</strong>
              <small>
                A4-Querformat ansehen, drucken oder im Browser als PDF speichern.
              </small>
            </a>
            <a
              class="gold-jahreskalender-card"
              href="/downloads/schulferien-bayern-2027.ics"
              download
              data-download-action="download-ics-bayern-2027"
            >
              <span>ICS</span>
              <strong>Kalenderdatei herunterladen</strong>
              <small>
                Schulferien und landesweite Feiertage für Kalender-Apps.
              </small>
            </a>
          </div>
          <p class="gold-jahreskalender-note">
            Die Jahresansicht unterscheidet offizielle Schulferien,
            unterrichtsfreie Tage, gesetzliche Feiertage und die von
            Schulferienklar berechnete direkt zusammenhängende freie Zeit.
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

        <nav class="gold-page-nav" aria-label="Inhalt dieser Seite">
          <a href="#termine">Alle Termine</a>
          <a href="#berechnung">Freie Zeit</a>
          <a href="#jahreskalender">Jahreskalender</a>
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

${bayern2027JahreskalenderHtml()}

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
${schulferienklarIntroCardHtml({ code, name, year })}
${bayern2027RelatedLinksHtml()}

        <a class="button" href="/?state=${code}&year=${year}">
          Bayern 2027 im Kalender öffnen
        </a>
      </section>
${seoFooterHtml()}    </main>
  </body>
</html>`;
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


function schulferienklarIntroCardHtml({ code, name, year }) {
  return `        <section class="intro-card intro-card-visual" aria-label="Schulferienklar kurz erklärt">
          <a class="intro-card-image-link" href="/?state=${code}&year=${year}" aria-label="Kalender öffnen">
            <img
              src="/og-image.png"
              alt="Schulferienklar Kalenderansicht mit Ferien und Feiertagen"
              loading="lazy"
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
            <a class="intro-card-link" href="/?state=${code}&year=${year}">
              Kalender öffnen
            </a>
          </div>
        </section>

`;
}

function pageTemplate({ slug, name, englishName, code, year, events }) {
  if (code === "BY" && year === 2027) {
    return bayern2027GoldPageTemplate({
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

${schulferienklarIntroCardHtml({ code, name, year })}
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


const holidayIndex = JSON.parse(fs.readFileSync(holidayIndexPath, "utf8"));
const publicHolidayIndex = JSON.parse(
  fs.readFileSync(publicHolidayIndexPath, "utf8")
);

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
