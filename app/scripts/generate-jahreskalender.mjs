import fs from "node:fs";
import path from "node:path";

import {
  addDaysToDateKey,
} from "../src/domain/date.js";
import {
  getSchoolEventCategoryLabel,
  isStateSchoolFreeDay,
} from "../src/domain/event-types.js";
import {
  generateIcsFeed,
} from "../src/domain/ics-feed.js";
import {
  getEffectiveFreePeriod,
} from "../src/domain/periods.js";
import {
  nodeHolidayRepository,
} from "./lib/node-data-repository.mjs";
import {
  getStateYearCombinations,
} from "./lib/site-config.mjs";

const publicDir = path.resolve("public");
const downloadsDir = path.join(
  publicDir,
  "downloads",
);

const months = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

const weekdays = [
  "KW",
  "Mo",
  "Di",
  "Mi",
  "Do",
  "Fr",
  "Sa",
  "So",
];

function clean(value) {
  return String(value).replace(/[ \t]+$/gm, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function parseDateKey(dateKey) {
  const [year, month, day] = String(dateKey)
    .split("-")
    .map(Number);

  return new Date(
    Date.UTC(year, month - 1, day),
  );
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(dateKey) {
  const [year, month, day] = String(dateKey)
    .split("-");

  return `${day}.${month}.${year}`;
}

function inRange(
  dateKey,
  startDate,
  endDate,
) {
  return (
    dateKey >= startDate &&
    dateKey <= endDate
  );
}

function isoWeek(dateKey) {
  const date = parseDateKey(dateKey);
  const day = date.getUTCDay() || 7;

  date.setUTCDate(
    date.getUTCDate() + 4 - day,
  );

  const yearStart = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      0,
      1,
    ),
  );

  return Math.ceil(
    (
      (
        date.getTime() -
        yearStart.getTime()
      ) /
        86400000 +
      1
    ) / 7,
  );
}

function maxDateKey(values) {
  const candidates = values
    .map((value) => String(value || ""))
    .filter((value) => {
      return /^\d{4}-\d{2}-\d{2}$/.test(
        value,
      );
    })
    .sort();

  return candidates.at(-1) || "2026-01-01";
}

function eventName(event) {
  return (
    event.name?.de ||
    event.name ||
    "Schulferien"
  );
}

function loadSchoolData(code) {
  const dataset =
    nodeHolidayRepository
      .loadSchoolHolidayDataset(code);

  if (!dataset) {
    throw new Error(
      `Schulferien-Datensatz fehlt: ${code}`,
    );
  }

  return dataset;
}

function loadPublicData(code, year) {
  const datasets = [
    year - 1,
    year,
    year + 1,
  ]
    .map((targetYear) => {
      return (
        nodeHolidayRepository
          .loadPublicHolidayDataset(
            code,
            targetYear,
          ) || null
      );
    })
    .filter(Boolean);

  const holidays = datasets
    .flatMap((dataset) => {
      return dataset.holidays || [];
    })
    .filter((holiday) => {
      return (
        holiday.scope === "statewide" &&
        holiday
          .includeInDefaultCalendar ===
          true
      );
    });

  const revisions = datasets.flatMap(
    (dataset) => {
      return [
        dataset.createdAt,
        ...(dataset.sources || []).map(
          (source) => source.lastCheckedAt,
        ),
      ];
    },
  );

  return {
    holidays,
    revision: maxDateKey(revisions),
  };
}

function schoolEventsForYear(
  dataset,
  year,
) {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  return (dataset.holidays || [])
    .filter((event) => {
      return (
        event
          .includeInDefaultCalendar !==
          false &&
        event.startDate <= yearEnd &&
        event.endDate >= yearStart
      );
    })
    .sort((left, right) => {
      return (
        left.startDate.localeCompare(
          right.startDate,
        ) ||
        left.endDate.localeCompare(
          right.endDate,
        )
      );
    });
}

function connectedDatesForYear({
  schoolEvents,
  publicHolidays,
  year,
}) {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const dates = new Set();

  for (const event of schoolEvents) {
    const period = getEffectiveFreePeriod(
      event,
      publicHolidays,
    );

    if (!period) {
      continue;
    }

    for (
      let cursor = period.startDate;
      cursor <= period.endDate;
      cursor = addDaysToDateKey(
        cursor,
        1,
      )
    ) {
      const isOfficial = inRange(
        cursor,
        event.startDate,
        event.endDate,
      );

      if (
        !isOfficial &&
        cursor >= yearStart &&
        cursor <= yearEnd
      ) {
        dates.add(cursor);
      }
    }
  }

  return dates;
}

function dayVisual({
  dateKey,
  schoolEvents,
  publicHolidays,
  connectedDates,
}) {
  const schoolEvent =
    schoolEvents.find((event) => {
      return inRange(
        dateKey,
        event.startDate,
        event.endDate,
      );
    });

  const publicHoliday =
    publicHolidays.find((holiday) => {
      return holiday.date === dateKey;
    });

  const classes = ["day"];
  const titles = [];

  if (schoolEvent) {
    classes.push(
      isStateSchoolFreeDay(schoolEvent)
        ? "school-free"
        : "holiday",
    );

    titles.push(eventName(schoolEvent));
  } else if (publicHoliday) {
    classes.push("public-holiday");

    titles.push(
      publicHoliday.name?.de ||
        "Gesetzlicher Feiertag",
    );
  } else if (
    connectedDates.has(dateKey)
  ) {
    classes.push("connected");

    titles.push(
      "Direkt zusammenhängende freie Zeit",
    );
  }

  if (schoolEvent && publicHoliday) {
    classes.push(
      "also-public-holiday",
    );

    titles.push(
      publicHoliday.name?.de ||
        "Gesetzlicher Feiertag",
    );
  }

  return {
    className: classes.join(" "),
    title: titles.join(" · "),
  };
}

function renderMonth({
  year,
  monthIndex,
  schoolEvents,
  publicHolidays,
  connectedDates,
}) {
  const firstDate = new Date(
    Date.UTC(year, monthIndex, 1),
  );

  const offset =
    (firstDate.getUTCDay() + 6) % 7;

  const daysInMonth = new Date(
    Date.UTC(
      year,
      monthIndex + 1,
      0,
    ),
  ).getUTCDate();

  const rows = [];

  for (
    let row = 0;
    row < 6;
    row += 1
  ) {
    const monday = new Date(
      Date.UTC(
        year,
        monthIndex,
        1 + row * 7 - offset,
      ),
    );

    const cells = [
      `<span class="week-number">${isoWeek(
        toDateKey(monday),
      )}</span>`,
    ];

    for (
      let column = 0;
      column < 7;
      column += 1
    ) {
      const day =
        row * 7 +
        column -
        offset +
        1;

      if (
        day < 1 ||
        day > daysInMonth
      ) {
        cells.push(
          '<span class="day empty" aria-hidden="true"></span>',
        );

        continue;
      }

      const dateKey = toDateKey(
        new Date(
          Date.UTC(
            year,
            monthIndex,
            day,
          ),
        ),
      );

      const visual = dayVisual({
        dateKey,
        schoolEvents,
        publicHolidays,
        connectedDates,
      });

      cells.push(
        `<span class="${visual.className}" title="${escapeHtml(
          visual.title,
        )}">${day}</span>`,
      );
    }

    rows.push(
      `<div class="calendar-row">${cells.join(
        "",
      )}</div>`,
    );
  }

  return `        <article class="month">
          <h2>${months[monthIndex]}</h2>
          <div class="weekday-row">
            ${weekdays
              .map(
                (name) =>
                  `<span>${name}</span>`,
              )
              .join("")}
          </div>
          ${rows.join("\n          ")}
        </article>`;
}

function statePageUrl({
  slug,
  year,
}) {
  return (
    "https://www.schulferienklar.de/" +
    `schulferien-${slug}-${year}.html`
  );
}

function createIcsEvents({
  state,
  year,
  schoolEvents,
  publicHolidays,
  schoolRevision,
  publicRevision,
  source,
}) {
  const pageUrl = statePageUrl({
    slug: state.slug,
    year,
  });

  const schoolItems =
    schoolEvents.map((event) => {
      const category =
        getSchoolEventCategoryLabel(
          event,
          "de",
        );

      return {
        uid:
          `school-${event.id || `${state.code}-${event.startDate}-${event.endDate}`}` +
          "@schulferienklar.de",
        title:
          `${eventName(event)} ` +
          `(${category})`,
        startDate: event.startDate,
        endDate: event.endDate,
        updatedAt:
          event.lastCheckedAt ||
          schoolRevision,
        description:
          `Schulferienklar · ${category} · ` +
          `${state.name} · Quelle: ` +
          `${
            event.sourceName ||
            source?.sourceName ||
            "offizielle Quelle"
          }`,
        url: pageUrl,
      };
    });

  const publicItems =
    publicHolidays
      .filter((holiday) => {
        return String(
          holiday.date,
        ).startsWith(String(year));
      })
      .map((holiday) => {
        const name =
          holiday.name?.de ||
          holiday.name ||
          "Gesetzlicher Feiertag";

        return {
          uid:
            `public-${holiday.id || `${state.code}-${holiday.date}`}` +
            "@schulferienklar.de",
          title: `${name} (Feiertag)`,
          startDate: holiday.date,
          endDate: holiday.date,
          updatedAt: publicRevision,
          description:
            "Schulferienklar · " +
            "Gesetzlicher Feiertag · " +
            `${state.name} · landesweit`,
          url: pageUrl,
        };
      });

  return [
    ...schoolItems,
    ...publicItems,
  ];
}

function generateYearIcs({
  state,
  year,
  events,
  revision,
}) {
  const fileName =
    `schulferien-${state.slug}-${year}.ics`;

  const sourceUrl =
    "https://www.schulferienklar.de/" +
    `downloads/${fileName}`;

  return generateIcsFeed({
    calendarName:
      `Schulferien und Feiertage ` +
      `${state.name} ${year}`,
    calendarDescription:
      `Einmaliger Kalenderdownload für ` +
      `${state.name} ${year}. Enthält ` +
      `landesweite Schulferien, ` +
      `unterrichtsfreie Tage und ` +
      `landesweit geltende gesetzliche ` +
      `Feiertage.`,
    sourceUrl,
    updatedAt: revision,
    events,
    productId:
      "-//Schulferienklar//" +
      `${state.code} ${year} ` +
      "Jahreskalender//DE",
  });
}

function generateHtml({
  state,
  year,
  schoolEvents,
  publicHolidays,
  connectedDates,
  source,
  checked,
}) {
  const monthsHtml = months
    .map((_, monthIndex) => {
      return renderMonth({
        year,
        monthIndex,
        schoolEvents,
        publicHolidays,
        connectedDates,
      });
    })
    .join("\n");

  const htmlFile =
    `jahreskalender-${state.slug}-${year}.html`;

  const pdfFile =
    `schulferien-${state.slug}-${year}.pdf`;

  const icsFile =
    `schulferien-${state.slug}-${year}.ics`;

  const calendarCode =
    state.code.toLowerCase();

  const canonical =
    statePageUrl({
      slug: state.slug,
      year,
    });

  const sourceName =
    source?.sourceName ||
    `Offizielle Ferienquelle ${state.name}`;

  return clean(`<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    />
    <meta name="robots" content="noindex,follow" />
    <meta name="theme-color" content="#f6f3ec" />
    <link rel="canonical" href="${canonical}" />
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
    <link
      rel="stylesheet"
      href="/jahreskalender.css"
    />
    <script
      defer
      src="/privacy-analytics.js"
    ></script>
    <title>Jahreskalender ${escapeHtml(
      state.name,
    )} ${year} · Schulferienklar</title>
  </head>
  <body>
    <main>
      <header class="top">
        <div>
          <p class="eyebrow">
            Schulferienklar Jahreskalender
          </p>
          <h1>
            Schulferien ${escapeHtml(
              state.name,
            )} ${year}
          </h1>
          <p class="intro">
            Zwölf Monate mit offiziellen Schulferien,
            landesweiten Feiertagen, unterrichtsfreien
            Tagen und direkt zusammenhängender freier Zeit.
          </p>
        </div>

        <div class="actions">
          <a
            class="primary-action"
            href="/downloads/${pdfFile}"
            download
            data-download-action="download-pdf-${state.slug}-${year}"
          >
            PDF herunterladen
          </a>

          <a
            href="webcal://www.schulferienklar.de/calendar/${calendarCode}.ics"
            data-download-action="subscribe-calendar-${calendarCode}"
          >
            Kalender abonnieren
          </a>

          <details class="download-options">
            <summary>
              Weitere Optionen
            </summary>
            <div class="download-options-panel">
              <a
                href="/downloads/${icsFile}"
                download
                data-download-action="download-ics-${state.slug}-${year}"
              >
                ICS-Datei herunterladen
              </a>

              <button
                type="button"
                class="secondary-action"
                onclick="window.print()"
                data-download-action="print-${state.slug}-${year}"
              >
                Drucken
              </button>
            </div>
          </details>

          <span class="print-hint">
            PDF: A4-Querformat · Das Kalender-Abo
            wird automatisch aktualisiert.
          </span>
        </div>
      </header>

      <section
        class="legend"
        aria-label="Kalender-Legende"
      >
        <span>
          <i class="ferien"></i>
          Schulferien
        </span>
        <span>
          <i class="frei"></i>
          Unterrichtsfrei
        </span>
        <span>
          <i class="feiertag"></i>
          Gesetzlicher Feiertag
        </span>
        <span>
          <i class="verbunden"></i>
          Zusammenhängend frei
        </span>
      </section>

      <section
        class="year-grid"
        aria-label="Kalenderjahr ${year}"
      >
${monthsHtml}
      </section>

      <footer class="source">
        <span>
          Quelle: ${escapeHtml(sourceName)} ·
          geprüft am ${formatDate(checked)}.
          Regionale und lokale Feiertage sind
          nicht als landesweit markiert.
        </span>
        <span>
          © Schulferienklar
        </span>
      </footer>
    </main>
  </body>
</html>`);
}

function clearGeneratedFiles() {
  fs.mkdirSync(
    downloadsDir,
    {
      recursive: true,
    },
  );

  for (
    const fileName of
    fs.readdirSync(downloadsDir)
  ) {
    const generatedHtml =
      /^jahreskalender-.+-\d{4}\.html$/.test(
        fileName,
      );

    const generatedIcs =
      /^schulferien-.+-\d{4}\.ics$/.test(
        fileName,
      );

    const generatedIndex =
      fileName ===
      "jahreskalender-index.json";

    if (
      generatedHtml ||
      generatedIcs ||
      generatedIndex
    ) {
      fs.unlinkSync(
        path.join(
          downloadsDir,
          fileName,
        ),
      );
    }
  }
}

const schoolIndex =
  nodeHolidayRepository
    .loadSchoolHolidayIndex();

const publicIndex =
  nodeHolidayRepository
    .loadPublicHolidayIndex();

const combinations =
  getStateYearCombinations();

clearGeneratedFiles();

const manifest = [];

for (const state of combinations) {
  const {
    slug,
    name,
    englishName,
    code,
    year,
  } = state;

  const schoolData =
    loadSchoolData(code);

  const source =
    schoolData.sources?.[0] || null;

  const schoolEvents =
    schoolEventsForYear(
      schoolData,
      year,
    );

  const publicResult =
    loadPublicData(
      code,
      year,
    );

  const connectedDates =
    connectedDatesForYear({
      schoolEvents,
      publicHolidays:
        publicResult.holidays,
      year,
    });

  const schoolRevision =
    maxDateKey([
      schoolData.createdAt,
      source?.lastCheckedAt,
      schoolIndex.generatedAt,
      ...schoolEvents.map((event) => {
        return event.lastCheckedAt;
      }),
    ]);

  const revision =
    maxDateKey([
      schoolRevision,
      publicResult.revision,
      publicIndex.generatedAt,
    ]);

  const normalizedState = {
    slug,
    name,
    englishName,
    code,
  };

  const icsEvents =
    createIcsEvents({
      state: normalizedState,
      year,
      schoolEvents,
      publicHolidays:
        publicResult.holidays,
      schoolRevision,
      publicRevision:
        publicResult.revision,
      source,
    });

  const htmlFileName =
    `jahreskalender-${slug}-${year}.html`;

  const icsFileName =
    `schulferien-${slug}-${year}.ics`;

  const pdfFileName =
    `schulferien-${slug}-${year}.pdf`;

  fs.writeFileSync(
    path.join(
      downloadsDir,
      htmlFileName,
    ),
    generateHtml({
      state: normalizedState,
      year,
      schoolEvents,
      publicHolidays:
        publicResult.holidays,
      connectedDates,
      source,
      checked: revision,
    }),
    "utf8",
  );

  fs.writeFileSync(
    path.join(
      downloadsDir,
      icsFileName,
    ),
    generateYearIcs({
      state: normalizedState,
      year,
      events: icsEvents,
      revision,
    }),
    "utf8",
  );

  manifest.push({
    stateCode: code,
    stateSlug: slug,
    stateName: name,
    year,
    checkedAt: revision,
    htmlUrl:
      `/downloads/${htmlFileName}`,
    pdfUrl:
      `/downloads/${pdfFileName}`,
    icsUrl:
      `/downloads/${icsFileName}`,
    subscriptionUrl:
      `/calendar/${code.toLowerCase()}.ics`,
    schoolEventCount:
      schoolEvents.length,
    publicHolidayCount:
      publicResult.holidays.filter(
        (holiday) => {
          return String(
            holiday.date,
          ).startsWith(String(year));
        },
      ).length,
  });
}

const manifestRevision =
  maxDateKey([
    schoolIndex.generatedAt,
    publicIndex.generatedAt,
    ...manifest.map(
      (item) => item.checkedAt,
    ),
  ]);

fs.writeFileSync(
  path.join(
    downloadsDir,
    "jahreskalender-index.json",
  ),
  `${JSON.stringify(
    {
      version: 1,
      generatedAt: manifestRevision,
      years: [
        ...new Set(
          manifest.map(
            (item) => item.year,
          ),
        ),
      ],
      calendars: manifest,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(
  `created ${manifest.length} Jahreskalender HTML files`,
);

console.log(
  `created ${manifest.length} yearly ICS files`,
);

console.log(
  "created downloads/jahreskalender-index.json",
);
