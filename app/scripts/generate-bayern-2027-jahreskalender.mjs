import fs from "node:fs";
import path from "node:path";

const publicDir = path.resolve("public");
const downloadsDir = path.join(publicDir, "downloads");
const holidayDir = path.join(publicDir, "data", "holidays");
const publicHolidayDir = path.join(publicDir, "data", "public-holidays");

const code = "BY";
const year = 2027;
const months = [
  "Januar", "Februar", "März", "April",
  "Mai", "Juni", "Juli", "August",
  "September", "Oktober", "November", "Dezember",
];
const weekdays = ["KW", "Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const clean = (text) => String(text).replace(/[ \t]+$/gm, "");

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function parseDateKey(dateKey) {
  const [y, m, d] = String(dateKey).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(dateKey, amount) {
  const date = parseDateKey(dateKey);
  date.setUTCDate(date.getUTCDate() + amount);
  return toDateKey(date);
}

function formatDate(dateKey) {
  const [y, m, d] = String(dateKey).split("-");
  return `${d}.${m}.${y}`;
}

function inRange(dateKey, startDate, endDate) {
  return dateKey >= startDate && dateKey <= endDate;
}

function isWeekend(dateKey) {
  return [0, 6].includes(parseDateKey(dateKey).getUTCDay());
}

function isoWeek(dateKey) {
  const date = parseDateKey(dateKey);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - start) / 86400000 + 1) / 7);
}

function eventName(event) {
  if (event.type === "spring") return "Frühjahrsferien";
  if (event.type === "all_saints") {
    return "Unterrichtsfreie Tage um Allerheiligen";
  }
  return event.name?.de || event.name || "Schulferien";
}

function loadSchoolData() {
  const index = readJson(path.join(holidayDir, "index.json"));
  const item = index.datasets.find((entry) => entry.bundeslandCode === code);
  if (!item?.jsonFile) throw new Error("Bayern-Schulferien-Datensatz fehlt.");
  return readJson(path.join(holidayDir, item.jsonFile));
}

function loadPublicData(targetYear) {
  const index = readJson(path.join(publicHolidayDir, "index.json"));
  const item = index.datasets.find((entry) => {
    return entry.bundeslandCode === code && entry.year === targetYear;
  });
  return item?.jsonFile
    ? readJson(path.join(publicHolidayDir, item.jsonFile))
    : { holidays: [] };
}

function isConnectedDay(dateKey, publicHolidays) {
  return isWeekend(dateKey) || publicHolidays.some((holiday) => {
    return holiday.date === dateKey &&
      holiday.scope === "statewide" &&
      holiday.includeInDefaultCalendar === true;
  });
}

function connectedPeriod(event, publicHolidays) {
  let startDate = event.startDate;
  let endDate = event.endDate;
  while (isConnectedDay(addDays(startDate, -1), publicHolidays)) {
    startDate = addDays(startDate, -1);
  }
  while (isConnectedDay(addDays(endDate, 1), publicHolidays)) {
    endDate = addDays(endDate, 1);
  }
  return { startDate, endDate };
}

function dayVisual(dateKey, schoolEvents, publicHolidays, connectedDates) {
  const schoolEvent = schoolEvents.find((event) => {
    return inRange(dateKey, event.startDate, event.endDate);
  });
  const publicHoliday = publicHolidays.find((holiday) => holiday.date === dateKey);
  const classes = ["day"];
  let title = "";

  if (schoolEvent?.category === "state_school_free_day") {
    classes.push("school-free");
    title = eventName(schoolEvent);
  } else if (schoolEvent) {
    classes.push("holiday");
    title = eventName(schoolEvent);
  } else if (publicHoliday) {
    classes.push("public-holiday");
    title = publicHoliday.name?.de || "Feiertag";
  } else if (connectedDates.has(dateKey)) {
    classes.push("connected");
    title = "Direkt zusammenhängende freie Zeit";
  }

  if (schoolEvent && publicHoliday) {
    classes.push("also-public-holiday");
    title += ` · ${publicHoliday.name?.de || "Feiertag"}`;
  }

  return { className: classes.join(" "), title };
}

function renderMonth(monthIndex, schoolEvents, publicHolidays, connectedDates) {
  const firstDate = new Date(Date.UTC(year, monthIndex, 1));
  const offset = (firstDate.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const rows = [];

  for (let row = 0; row < 6; row += 1) {
    const monday = new Date(Date.UTC(year, monthIndex, 1 + row * 7 - offset));
    const cells = [
      `<span class="week-number">${isoWeek(toDateKey(monday))}</span>`,
    ];

    for (let column = 0; column < 7; column += 1) {
      const day = row * 7 + column - offset + 1;

      if (day < 1 || day > daysInMonth) {
        cells.push('<span class="day empty" aria-hidden="true"></span>');
        continue;
      }

      const dateKey = toDateKey(new Date(Date.UTC(year, monthIndex, day)));
      const visual = dayVisual(dateKey, schoolEvents, publicHolidays, connectedDates);
      cells.push(
        `<span class="${visual.className}" title="${escapeHtml(visual.title)}">${day}</span>`
      );
    }

    rows.push(`<div class="calendar-row">${cells.join("")}</div>`);
  }

  return `        <article class="month">
          <h2>${months[monthIndex]}</h2>
          <div class="weekday-row">
            ${weekdays.map((name) => `<span>${name}</span>`).join("")}
          </div>
          ${rows.join("\n          ")}
        </article>`;
}

function escapeIcs(value) {
  return String(value || "")
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\n", "\\n");
}

function foldLine(line) {
  const segments = [];
  let remaining = String(line);
  let firstLine = true;

  while (remaining.length > 0) {
    const byteLimit = firstLine ? 73 : 72;
    let chunk = "";
    let consumedCharacters = 0;

    for (const character of remaining) {
      if (
        Buffer.byteLength(chunk + character, "utf8") >
        byteLimit
      ) {
        break;
      }

      chunk += character;
      consumedCharacters += character.length;
    }

    if (!chunk) {
      const [character] = [...remaining];
      chunk = character;
      consumedCharacters = character.length;
    }

    remaining = remaining.slice(consumedCharacters);

    while (chunk.endsWith(" ")) {
      chunk = chunk.slice(0, -1);
      remaining = ` ${remaining}`;
    }

    segments.push(firstLine ? chunk : ` ${chunk}`);
    firstLine = false;
  }

  return segments.join("\n");
}

function icsEvent({ uid, title, start, end, description, stamp }) {
  return [
    "BEGIN:VEVENT",
    `UID:${escapeIcs(uid)}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${start.replaceAll("-", "")}`,
    `DTEND;VALUE=DATE:${addDays(end, 1).replaceAll("-", "")}`,
    `SUMMARY:${escapeIcs(title)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    "END:VEVENT",
  ].map(foldLine).join("\n");
}

function generateIcs(events, publicHolidays, source) {
  const checked = source?.lastCheckedAt || "2026-05-24";
  const stamp = `${checked.replaceAll("-", "")}T000000Z`;
  const schoolItems = events.map((event) => icsEvent({
    uid: `${event.id}@schulferienklar.de`,
    title: `${eventName(event)} (${event.category === "state_school_free_day" ? "Unterrichtsfrei" : "Schulferien"})`,
    start: event.startDate,
    end: event.endDate,
    description: `Schulferienklar · Bayern 2027 · Quelle: ${source?.sourceName || "Freistaat Bayern"}`,
    stamp,
  }));
  const publicItems = publicHolidays
    .filter((holiday) => String(holiday.date).startsWith(String(year)))
    .map((holiday) => icsEvent({
      uid: `${holiday.id}@schulferienklar.de`,
      title: `${holiday.name?.de || "Feiertag"} (Feiertag)`,
      start: holiday.date,
      end: holiday.date,
      description: "Schulferienklar · Gesetzlicher Feiertag · Bayern",
      stamp,
    }));

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Schulferienklar//Bayern 2027 Jahreskalender//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Schulferien Bayern 2027",
    ...schoolItems,
    ...publicItems,
    "END:VCALENDAR",
    "",
  ].map(foldLine).join("\n");
}

function generateHtml(schoolEvents, publicHolidays, connectedDates, source) {
  const monthsHtml = months
    .map((_, index) => renderMonth(index, schoolEvents, publicHolidays, connectedDates))
    .join("\n");
  const sourceName = source?.sourceName ||
    "Bayerisches Staatsministerium für Unterricht und Kultus";
  const checked = source?.lastCheckedAt || "2026-05-24";

  return clean(`<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex,follow" />
    <link rel="canonical" href="https://www.schulferienklar.de/schulferien-bayern-2027.html" />
    <link rel="stylesheet" href="/jahreskalender.css" />
    <title>Jahreskalender Bayern 2027 · Schulferienklar</title>
  </head>
  <body>
    <main>
      <header class="top">
        <div>
          <p class="eyebrow">Schulferienklar Jahreskalender</p>
          <h1>Schulferien Bayern 2027</h1>
          <p class="intro">
            Zwölf Monate mit offiziellen Schulferien, landesweiten Feiertagen,
            unterrichtsfreien Tagen und direkt zusammenhängender freier Zeit.
          </p>
        </div>
        <div class="actions">
          <button type="button" onclick="window.print()">
            Drucken / PDF (Querformat)
          </button>
          <a href="/downloads/schulferien-bayern-2027.ics" download>
            ICS herunterladen
          </a>
          <span class="print-hint">
            Im Druckdialog bitte Querformat wählen.
          </span>

        </div>
      </header>

      <section class="legend" aria-label="Kalender-Legende">
        <span><i class="ferien"></i>Schulferien</span>
        <span><i class="frei"></i>Unterrichtsfrei</span>
        <span><i class="feiertag"></i>Gesetzlicher Feiertag</span>
        <span><i class="verbunden"></i>Zusammenhängend frei</span>
      </section>

      <section class="year-grid" aria-label="Kalenderjahr 2027">
${monthsHtml}
      </section>

      <footer class="source">
        <span>
          Quelle: ${escapeHtml(sourceName)} · geprüft am ${formatDate(checked)}.
          Regionale und lokale Feiertage sind nicht als landesweit markiert.
        </span>
        <span>© 2026 Joan · Schulferienklar</span>
      </footer>
    </main>
  </body>
</html>`);
}

const schoolData = loadSchoolData();
const source = schoolData.sources?.[0] || null;
const yearStart = `${year}-01-01`;
const yearEnd = `${year}-12-31`;

const schoolEvents = (schoolData.holidays || [])
  .filter((event) => {
    return event.includeInDefaultCalendar !== false &&
      event.startDate <= yearEnd &&
      event.endDate >= yearStart;
  })
  .sort((a, b) => a.startDate.localeCompare(b.startDate));

const publicHolidays = [year - 1, year, year + 1]
  .map(loadPublicData)
  .flatMap((dataset) => dataset.holidays || [])
  .filter((holiday) => {
    return holiday.scope === "statewide" &&
      holiday.includeInDefaultCalendar === true;
  });

const connectedDates = new Set();
schoolEvents.forEach((event) => {
  const period = connectedPeriod(event, publicHolidays);
  for (
    let cursor = period.startDate;
    cursor <= period.endDate;
    cursor = addDays(cursor, 1)
  ) {
    if (
      !inRange(cursor, event.startDate, event.endDate) &&
      cursor >= yearStart &&
      cursor <= yearEnd
    ) {
      connectedDates.add(cursor);
    }
  }
});

fs.mkdirSync(downloadsDir, { recursive: true });
const htmlPath = path.join(downloadsDir, "jahreskalender-bayern-2027.html");
const icsPath = path.join(downloadsDir, "schulferien-bayern-2027.ics");

fs.writeFileSync(
  htmlPath,
  generateHtml(schoolEvents, publicHolidays, connectedDates, source),
  "utf8"
);
fs.writeFileSync(
  icsPath,
  generateIcs(schoolEvents, publicHolidays, source),
  "utf8"
);

console.log(`created ${path.relative(publicDir, htmlPath)}`);
console.log(`created ${path.relative(publicDir, icsPath)}`);
