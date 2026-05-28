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

function holidaySummaryHtml(events, name, year) {
  if (events.length === 0) {
    return `<p>Für ${escapeHtml(name)} ${year} sind in Schulferienklar aktuell keine Ferien-Einträge verfügbar.</p>`;
  }

  const items = events
    .map((event) => {
      const label = getCategoryLabel(event.category);
      const eventName = getHolidayName(event);
      return `          <li>
            <strong>${escapeHtml(eventName)}</strong>
            <span>${formatDate(event.startDate)} – ${formatDate(event.endDate)}</span>
            <small>${label}</small>
          </li>`;
    })
    .join("\n");

  return `<ul class="holiday-summary-list">
${items}
        </ul>`;
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
      <section class="card">
        <p class="eyebrow">Schulferien ${year}</p>
        <h1>Schulferien ${name} ${year}</h1>

        <p>
          Schulferienklar zeigt Schulferien, gesetzliche Feiertage und freie Zeiten
          für ${name} übersichtlich im Kalender.
        </p>

        <h2>Ferienübersicht ${name} ${year}</h2>
        ${holidaySummaryHtml(events, name, year)}

        <p>
          Die App hilft Familien, Schüler:innen und allen, die Betreuung, Reisen,
          Lernzeiten oder freie Tage rund um die Schulferien planen möchten.
        </p>

        <h2>School holidays ${englishName} ${year}</h2>
        <p>
          English note: Schulferienklar helps international residents in Germany
          check school holidays, public holidays and connected free days by federal state.
        </p>

        <a class="button" href="/?state=${code}&year=${year}">Kalender öffnen</a>

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
