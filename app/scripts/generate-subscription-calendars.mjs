import fs from "node:fs";
import path from "node:path";

import {
  generateIcsFeed,
} from "../src/domain/ics-feed.js";
import {
  getSchoolEventCategoryLabel,
} from "../src/domain/event-types.js";
import {
  nodeHolidayRepository,
} from "./lib/node-data-repository.mjs";

const YEARS = [2026, 2027, 2028, 2029, 2030];
const COVERAGE_START = `${YEARS[0]}-01-01`;
const COVERAGE_END =
  `${YEARS.at(-1)}-12-31`;

const publicDir = path.resolve("public");
const calendarDir = path.join(publicDir, "calendar");

function maxDateKey(values) {
  const candidates = values
    .map((value) => String(value || ""))
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
    .sort();

  return candidates.at(-1) || "2026-01-01";
}

function firstSource(dataset) {
  return dataset?.sources?.[0] || null;
}

function overlapsCoverage(event) {
  return (
    event.startDate <= COVERAGE_END &&
    event.endDate >= COVERAGE_START
  );
}

function statePageUrl(code, dateKey) {
  const year = String(dateKey).slice(0, 4);

  return (
    "https://www.schulferienklar.de/" +
    `?state=${encodeURIComponent(code)}` +
    `&year=${encodeURIComponent(year)}`
  );
}

function loadPublicHolidayEvents({
  code,
  stateName,
  publicHolidayIndex,
}) {
  const events = [];
  const revisions = [];

  const metas = (publicHolidayIndex.datasets || [])
    .filter((meta) => {
      return (
        meta.bundeslandCode === code &&
        YEARS.includes(Number(meta.year))
      );
    })
    .sort((a, b) => Number(a.year) - Number(b.year));

  for (const meta of metas) {
    const dataset =
      nodeHolidayRepository
        .loadPublicHolidayDatasetByMeta(meta);

    if (!dataset) {
      throw new Error(
        `Public holiday dataset missing: ${code} ${meta.year}`,
      );
    }

    const source = firstSource(dataset);
    const revision = maxDateKey([
      dataset.createdAt,
      source?.lastCheckedAt,
      publicHolidayIndex.generatedAt,
    ]);

    revisions.push(revision);

    for (const holiday of dataset.holidays || []) {
      if (
        holiday.scope !== "statewide" ||
        holiday.includeInDefaultCalendar !== true
      ) {
        continue;
      }

      const name =
        holiday.name?.de ||
        holiday.name ||
        "Gesetzlicher Feiertag";

      events.push({
        uid:
          `${holiday.id || `${code}-${holiday.date}`}` +
          "@schulferienklar.de",
        title: `${name} (Feiertag)`,
        startDate: holiday.date,
        endDate: holiday.date,
        updatedAt: revision,
        description:
          `Schulferienklar · Gesetzlicher Feiertag · ` +
          `${stateName} · landesweit`,
        url: statePageUrl(code, holiday.date),
      });
    }
  }

  return {
    events,
    updatedAt: maxDateKey(revisions),
  };
}

function loadSchoolHolidayEvents({
  code,
  stateName,
  schoolDataset,
  schoolHolidayIndex,
}) {
  const source = firstSource(schoolDataset);
  const defaultRevision = maxDateKey([
    schoolDataset.createdAt,
    source?.lastCheckedAt,
    schoolHolidayIndex.generatedAt,
  ]);

  const events = (schoolDataset.holidays || [])
    .filter((event) => {
      return (
        event.includeInDefaultCalendar !== false &&
        overlapsCoverage(event)
      );
    })
    .map((event) => {
      const name =
        event.name?.de ||
        event.name ||
        "Schulferien";

      const category =
        getSchoolEventCategoryLabel(event, "de");

      const sourceName =
        event.sourceName ||
        source?.sourceName ||
        "offizielle Quelle";

      return {
        uid:
          `${event.id || `${code}-${event.startDate}-${event.endDate}`}` +
          "@schulferienklar.de",
        title: `${name} (${category})`,
        startDate: event.startDate,
        endDate: event.endDate,
        updatedAt:
          event.lastCheckedAt ||
          defaultRevision,
        description:
          `Schulferienklar · ${category} · ${stateName}` +
          ` · Quelle: ${sourceName}`,
        url: statePageUrl(code, event.startDate),
      };
    });

  return {
    events,
    updatedAt: maxDateKey([
      defaultRevision,
      ...events.map((event) => event.updatedAt),
    ]),
  };
}

function clearGeneratedFeeds() {
  fs.mkdirSync(calendarDir, { recursive: true });

  for (const file of fs.readdirSync(calendarDir)) {
    if (file.endsWith(".ics") || file === "index.json") {
      fs.unlinkSync(path.join(calendarDir, file));
    }
  }
}

const schoolHolidayIndex =
  nodeHolidayRepository.loadSchoolHolidayIndex();

const publicHolidayIndex =
  nodeHolidayRepository.loadPublicHolidayIndex();

clearGeneratedFeeds();

const feeds = [];

for (const meta of [...(schoolHolidayIndex.datasets || [])]
  .sort((a, b) => {
    return a.bundeslandName.localeCompare(
      b.bundeslandName,
      "de-DE",
    );
  })) {
  const code = meta.bundeslandCode;
  const stateName = meta.bundeslandName;

  const schoolDataset =
    nodeHolidayRepository
      .loadSchoolHolidayDatasetByMeta(meta);

  if (!schoolDataset) {
    throw new Error(
      `School holiday dataset missing: ${code}`,
    );
  }

  const schoolResult = loadSchoolHolidayEvents({
    code,
    stateName,
    schoolDataset,
    schoolHolidayIndex,
  });

  const publicResult = loadPublicHolidayEvents({
    code,
    stateName,
    publicHolidayIndex,
  });

  const events = [
    ...schoolResult.events,
    ...publicResult.events,
  ];

  const updatedAt = maxDateKey([
    schoolResult.updatedAt,
    publicResult.updatedAt,
  ]);

  const fileName = `${code.toLowerCase()}.ics`;
  const relativeUrl = `/calendar/${fileName}`;
  const subscriptionUrl =
    `https://www.schulferienklar.de${relativeUrl}`;

  const content = generateIcsFeed({
    calendarName:
      `Schulferien und Feiertage ${stateName}`,
    calendarDescription:
      `Automatisch aktualisierter Kalender für ${stateName}. ` +
      `Enthält landesweite Schulferien, unterrichtsfreie ` +
      `Tage und landesweit geltende gesetzliche Feiertage.`,
    sourceUrl: subscriptionUrl,
    updatedAt,
    events,
  });

  fs.writeFileSync(
    path.join(calendarDir, fileName),
    content,
    "utf8",
  );

  feeds.push({
    bundeslandCode: code,
    bundeslandName: stateName,
    file: fileName,
    url: relativeUrl,
    subscriptionUrl,
    coverage: {
      startYear: YEARS[0],
      endYear: YEARS.at(-1),
    },
    updatedAt,
    schoolEventCount: schoolResult.events.length,
    publicHolidayCount: publicResult.events.length,
    eventCount: events.length,
  });

  console.log(
    `created calendar/${fileName} ` +
      `(${events.length} events)`,
  );
}

const manifest = {
  version: "1.0",
  generatedAt: maxDateKey(
    feeds.map((feed) => feed.updatedAt),
  ),
  totalStates: feeds.length,
  coverage: {
    startYear: YEARS[0],
    endYear: YEARS.at(-1),
  },
  feeds,
};

fs.writeFileSync(
  path.join(calendarDir, "index.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

console.log(
  `created calendar/index.json (${feeds.length} feeds)`,
);
