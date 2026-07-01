import fs from "node:fs";
import path from "node:path";

const outputDir = path.resolve("public");
const holidayDataDir = path.resolve("public/data/holidays");
const holidayIndexPath = path.join(holidayDataDir, "index.json");

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

function formatDate(dateKey) {
  const [year, month, day] = String(dateKey).split("-");
  return `${day}.${month}.${year}`;
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


function sharedSeoStyles() {
  return `    <style>
      .seo-top-nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        max-width: 920px;
        margin: 0 auto 16px;
        padding: 0 2px;
        color: rgba(23, 32, 51, 0.7);
        font-size: 0.95rem;
        font-weight: 800;
      }

      .seo-brand {
        color: #1f6f64;
        font-weight: 950;
        text-decoration: none;
      }

      .seo-top-links {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .seo-top-links a {
        color: #1f6f64;
        text-decoration: none;
      }

      .seo-top-links a:hover,
      .seo-brand:hover {
        text-decoration: underline;
      }

      @media (max-width: 640px) {
        .seo-top-nav {
          display: grid;
          gap: 6px;
          margin-bottom: 12px;
        }

        .seo-top-links {
          justify-content: start;
          font-size: 0.9rem;
        }
      }

      body {
        margin: 0;
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #172033;
        background: #f6f3ec;
        line-height: 1.6;
      }

      main {
        width: min(860px, calc(100% - 32px));
        margin: 0 auto;
        padding: 48px 0;
      }

      .card {
        border-radius: 28px;
        padding: 32px;
        background: rgba(255, 255, 255, 0.86);
        border: 1px solid rgba(23, 32, 51, 0.08);
        box-shadow: 0 20px 60px rgba(40, 55, 85, 0.1);
      }

      .eyebrow {
        margin: 0 0 12px;
        color: #1f6f64;
        font-size: 0.82rem;
        font-weight: 900;
        letter-spacing: 0.22em;
        text-transform: uppercase;
      }

      h1 {
        margin: 0;
        font-size: clamp(2.5rem, 8vw, 5rem);
        line-height: 0.95;
        letter-spacing: -0.065em;
      }

      h2 {
        margin-top: 2rem;
      }

      p {
        color: #56616f;
        font-size: 1.08rem;
      }

      a {
        color: #1f6f64;
        font-weight: 800;
      }

      .button {
        display: inline-flex;
        margin-top: 18px;
        border-radius: 999px;
        padding: 14px 20px;
        background: #1f6f64;
        color: white;
        text-decoration: none;
        font-weight: 900;
      }

      .holiday-summary-list {
        display: grid;
        gap: 10px;
        padding: 0;
        margin: 18px 0 0;
        list-style: none;
      }

      .holiday-summary-list li {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 4px 16px;
        padding: 14px 16px;
        border-radius: 18px;
        background: rgba(232, 247, 240, 0.62);
        border: 1px solid rgba(31, 111, 100, 0.14);
      }

      .holiday-summary-list strong {
        color: #172033;
      }

      .holiday-summary-list span {
        color: #1f6f64;
        font-weight: 900;
      }

      .holiday-summary-list small {
        grid-column: 1 / -1;
        color: #66717f;
        font-weight: 800;
      }

      .note {
        margin-top: 24px;
        border-radius: 18px;
        padding: 16px 18px;
        background: rgba(232, 247, 240, 0.78);
        border: 1px solid rgba(31, 111, 100, 0.18);
      }

      @media (max-width: 640px) {
        .card {
          padding: 24px;
        }

        .holiday-summary-list li {
          grid-template-columns: 1fr;
        }
      }
    </style>`;
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
        <ul class="holiday-summary-list">
${yearLinks}
        </ul>

        <h3>Andere Bundesländer ${year}</h3>
        <ul class="holiday-summary-list">
${stateLinks}
        </ul>

        <h3>Übersichten</h3>
        <ul class="holiday-summary-list">
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

function pageTemplate({ slug, name, englishName, code, year, events }) {
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
    <style>
      body {
        margin: 0;
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #172033;
        background: #f6f3ec;
        line-height: 1.6;
      }

      main {
        width: min(860px, calc(100% - 32px));
        margin: 0 auto;
        padding: 48px 0;
      }

      .card {
        border-radius: 28px;
        padding: 32px;
        background: rgba(255, 255, 255, 0.86);
        border: 1px solid rgba(23, 32, 51, 0.08);
        box-shadow: 0 20px 60px rgba(40, 55, 85, 0.1);
      }

      .eyebrow {
        margin: 0 0 12px;
        color: #1f6f64;
        font-size: 0.82rem;
        font-weight: 900;
        letter-spacing: 0.22em;
        text-transform: uppercase;
      }

      h1 {
        margin: 0;
        font-size: clamp(2.5rem, 8vw, 5rem);
        line-height: 0.95;
        letter-spacing: -0.065em;
      }

      h2 {
        margin-top: 2rem;
      }

      p {
        color: #56616f;
        font-size: 1.08rem;
      }

      a {
        color: #1f6f64;
        font-weight: 800;
      }

      .button {
        display: inline-flex;
        margin-top: 18px;
        border-radius: 999px;
        padding: 14px 20px;
        background: #1f6f64;
        color: white;
        text-decoration: none;
        font-weight: 900;
      }

      .holiday-summary-list {
        display: grid;
        gap: 10px;
        padding: 0;
        margin: 18px 0 0;
        list-style: none;
      }

      .holiday-summary-list li {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 4px 16px;
        padding: 14px 16px;
        border-radius: 18px;
        background: rgba(232, 247, 240, 0.62);
        border: 1px solid rgba(31, 111, 100, 0.14);
      }

      .holiday-summary-list strong {
        color: #172033;
      }

      .holiday-summary-list span {
        color: #1f6f64;
        font-weight: 900;
      }

      .holiday-summary-list small {
        grid-column: 1 / -1;
        color: #66717f;
        font-weight: 800;
      }

      .note {
        margin-top: 24px;
        border-radius: 18px;
        padding: 16px 18px;
        background: rgba(232, 247, 240, 0.78);
        border: 1px solid rgba(31, 111, 100, 0.18);
      }

      @media (max-width: 640px) {
        .card {
          padding: 24px;
        }

        .holiday-summary-list li {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main>
${seoTopNavHtml({ appHref: `/?state=${code}&year=${year}` })}      <section class="card">
        <p class="eyebrow">Schulferien ${year}</p>
        <h1>Schulferien ${name} ${year}</h1>

        <p>
          Schulferienklar zeigt Schulferien, gesetzliche Feiertage und freie Zeiten
          für ${name} übersichtlich im Kalender.
        </p>

${stateYearQueryIntroHtml(name, year, events)}

        <h2>Ferienübersicht ${name} ${year}</h2>
        ${holidaySummaryHtml(events, name, year)}

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

        <div class="note">
          <strong>Hinweis:</strong>
          Für verbindliche Auskünfte sind die offiziellen Veröffentlichungen des
          jeweiligen Bundeslandes maßgeblich.
        </div>
      </section>
    </main>
  </body>
</html>`;
}


function stateHubTemplate({ holidayIndex, slug, name, englishName, code }) {
  const title = `Schulferien ${name} – Termine, Feiertage und Kalender`;
  const description = `Schulferien in ${name}: aktuelle Ferientermine, Feiertage und freie Tage für die nächsten Jahre übersichtlich im Kalender.`;

  const yearLinks = years
    .map((year) => {
      return `          <li><a href="/schulferien-${slug}-${year}.html">Schulferien ${escapeHtml(name)} ${year}</a></li>`;
    })
    .join("\n");

  const yearSummaryCards = years
    .map((year) => {
      const events = getEventsForStateAndYear({ holidayIndex, code, year });
      const firstEvent = events[0];
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
  <body>
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

        <h2>Alle Jahre für ${escapeHtml(name)}</h2>
        <ul class="holiday-summary-list">
${yearLinks}
        </ul>

        <h2>Travel planning with school holidays</h2>
        <p>
          Planning a trip to Germany? School holidays in ${escapeHtml(name)} can affect
          hotels, trains and popular attractions during busy family travel periods.
        </p>
        <p>
          <a href="/germany-travel-checker.html">Check your Germany travel dates</a>
          before booking your trip.
        </p>

        <p>
          Schulferienklar hilft bei der Planung von Betreuung, Reisen, Lernzeiten
          und freien Tagen rund um die Ferien in ${escapeHtml(name)}.
        </p>

        <a class="button" href="/?state=${code}">Kalender für ${escapeHtml(name)} öffnen</a>

${dataTrustNoteHtml()}

        <div class="note">
          <strong>Datenhinweis:</strong>
          Für verbindliche Auskünfte sind die offiziellen Veröffentlichungen des
          jeweiligen Bundeslandes maßgeblich. <a href="/datenquellen.html">Mehr zu den Datenquellen</a>.
        </div>
      </section>
    </main>
  </body>
</html>`;
}

function yearHubTemplate({ holidayIndex, year }) {
  const title = `Schulferien ${year} in Deutschland – alle Bundesländer`;
  const description = `Schulferien ${year} in Deutschland: Ferientermine der Bundesländer übersichtlich vergleichen und freie Tage besser planen.`;

  const stateLinks = states
    .map(([slug, name]) => {
      return `          <li><a href="/schulferien-${slug}-${year}.html">Schulferien ${escapeHtml(name)} ${year}</a></li>`;
    })
    .join("\n");

  const stateSummaryCards = states
    .map(([slug, name, _englishName, code]) => {
      const events = getEventsForStateAndYear({ holidayIndex, code, year });
      const firstEvent = events[0];
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
  <body>
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

        <h2>Alle Bundesländer ${year}</h2>
        <ul class="holiday-summary-list">
${stateLinks}
        </ul>

        <a class="button" href="/?year=${year}">Kalender ${year} öffnen</a>

${dataTrustNoteHtml()}

        <div class="note">
          <strong>Datenhinweis:</strong>
          Für verbindliche Auskünfte sind die offiziellen Veröffentlichungen der
          Bundesländer maßgeblich. <a href="/datenquellen.html">Mehr zu den Datenquellen</a>.
        </div>
      </section>
    </main>
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

for (const year of years) {
  for (const [slug, name, englishName, code] of states) {
    const fileName = `schulferien-${slug}-${year}.html`;
    const events = getEventsForStateAndYear({ holidayIndex, code, year });

    fs.writeFileSync(
      path.join(outputDir, fileName),
      pageTemplate({ slug, name, englishName, code, year, events }),
      "utf8"
    );

    console.log(`created ${fileName} (${events.length} entries)`);
  }
}

for (const [slug, name, englishName, code] of states) {
  const fileName = `schulferien-${slug}.html`;

  fs.writeFileSync(
    path.join(outputDir, fileName),
    stateHubTemplate({ holidayIndex, slug, name, englishName, code }),
    "utf8"
  );

  console.log(`created ${fileName}`);
}

for (const year of years) {
  const fileName = `schulferien-${year}.html`;

  fs.writeFileSync(
    path.join(outputDir, fileName),
    yearHubTemplate({ holidayIndex, year }),
    "utf8"
  );

  console.log(`created ${fileName}`);
}

writeSitemap();
