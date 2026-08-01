import fs from "node:fs";
import path from "node:path";

import {
  nodeHolidayRepository,
} from "./lib/node-data-repository.mjs";
import {
  STATES,
  YEARS,
} from "./lib/site-config.mjs";

const publicDir = path.resolve("public");
const calendarDir = path.join(publicDir, "calendar");
const indexPath = path.join(calendarDir, "index.json");

const expectedCodes = STATES
  .map(([, , , code]) => code)
  .sort();


const errors = [];

const publicHolidayIndex =
  nodeHolidayRepository.loadPublicHolidayIndex();

function validatePublicHolidayScope({
  code,
  fileName,
  content,
}) {
  const metas = (publicHolidayIndex.datasets || [])
    .filter((meta) => {
      return (
        meta.bundeslandCode === code &&
        YEARS.includes(Number(meta.year))
      );
    });

  for (const meta of metas) {
    const dataset =
      nodeHolidayRepository
        .loadPublicHolidayDatasetByMeta(meta);

    if (!dataset) {
      errors.push(
        `${fileName}: missing source dataset ${code} ${meta.year}`,
      );
      continue;
    }

    for (const holiday of dataset.holidays || []) {
      const uidValue =
        holiday.id ||
        `${code}-${holiday.date}`;
      const uidLine =
        `UID:${uidValue}@schulferienklar.de`;

      const shouldBeIncluded =
        holiday.scope === "statewide" &&
        holiday.includeInDefaultCalendar === true;

      if (
        shouldBeIncluded &&
        !content.includes(uidLine)
      ) {
        errors.push(
          `${fileName}: missing statewide holiday ${uidValue}`,
        );
      }

      if (
        !shouldBeIncluded &&
        content.includes(uidLine)
      ) {
        errors.push(
          `${fileName}: regional or local holiday included ${uidValue}`,
        );
      }
    }
  }
}

function countMatches(value, pattern) {
  return (value.match(pattern) || []).length;
}

function validateCrLfAndLineLength(fileName, content) {
  const withoutCrLf = content.replaceAll("\r\n", "");

  if (
    withoutCrLf.includes("\n") ||
    withoutCrLf.includes("\r")
  ) {
    errors.push(`${fileName}: expected CRLF line endings`);
  }

  for (const line of content.split("\r\n")) {
    if (Buffer.byteLength(line, "utf8") > 75) {
      errors.push(
        `${fileName}: line exceeds 75 UTF-8 octets`,
      );
      break;
    }
  }
}

function validateEvents(fileName, content, expectedCount) {
  const blocks = Array.from(
    content.matchAll(
      /BEGIN:VEVENT\r\n([\s\S]*?)\r\nEND:VEVENT/g,
    ),
    (match) => match[1],
  );

  if (blocks.length !== expectedCount) {
    errors.push(
      `${fileName}: expected ${expectedCount} events, ` +
        `found ${blocks.length}`,
    );
  }

  const uids = [];

  for (const block of blocks) {
    const uid =
      /^UID:(.+)$/m.exec(block)?.[1] || "";

    const start =
      /^DTSTART;VALUE=DATE:(\d{8})$/m.exec(block)?.[1];

    const end =
      /^DTEND;VALUE=DATE:(\d{8})$/m.exec(block)?.[1];

    if (!uid.endsWith("@schulferienklar.de")) {
      errors.push(`${fileName}: invalid or missing UID`);
    }

    if (!start || !end || end <= start) {
      errors.push(
        `${fileName}: invalid exclusive DTSTART/DTEND`,
      );
    }

    if (!/^DTSTAMP:\d{8}T000000Z$/m.test(block)) {
      errors.push(`${fileName}: missing deterministic DTSTAMP`);
    }

    if (!/^LAST-MODIFIED:\d{8}T000000Z$/m.test(block)) {
      errors.push(`${fileName}: missing LAST-MODIFIED`);
    }

    if (!/^SEQUENCE:\d{8}$/m.test(block)) {
      errors.push(`${fileName}: missing revision SEQUENCE`);
    }

    uids.push(uid);
  }

  if (new Set(uids).size !== uids.length) {
    errors.push(`${fileName}: duplicate event UIDs`);
  }
}

if (!fs.existsSync(indexPath)) {
  errors.push("Missing calendar/index.json");
} else {
  const manifest = JSON.parse(
    fs.readFileSync(indexPath, "utf8"),
  );

  const feeds = manifest.feeds || [];
  const actualCodes = feeds
    .map((feed) => feed.bundeslandCode)
    .sort();

  if (manifest.totalStates !== 16 || feeds.length !== 16) {
    errors.push(
      `Expected 16 subscription feeds, found ${feeds.length}`,
    );
  }

  if (
    JSON.stringify(actualCodes) !==
    JSON.stringify([...expectedCodes].sort())
  ) {
    errors.push(
      "Subscription feed Bundesland coverage is incomplete",
    );
  }

  if (
    manifest.coverage?.startYear !== YEARS[0] ||
    manifest.coverage?.endYear !== YEARS.at(-1)
  ) {
    errors.push("Unexpected subscription feed coverage");
  }

  for (const feed of feeds) {
    const filePath = path.join(calendarDir, feed.file);
    const label = `calendar/${feed.file}`;

    if (!fs.existsSync(filePath)) {
      errors.push(`${label}: missing file`);
      continue;
    }

    const content = fs.readFileSync(filePath, "utf8");

    const requiredPatterns = [
      ["VCALENDAR start", /^BEGIN:VCALENDAR\r\n/],
      ["VCALENDAR end", /END:VCALENDAR\r\n$/],
      ["publish method", /\r\nMETHOD:PUBLISH\r\n/],
      ["calendar name", /\r\nX-WR-CALNAME:/],
      [
        "refresh interval",
        /\r\nREFRESH-INTERVAL;VALUE=DURATION:PT12H\r\n/,
      ],
      [
        "published TTL",
        /\r\nX-PUBLISHED-TTL:PT12H\r\n/,
      ],
      ["2026 coverage", /DTSTART;VALUE=DATE:2026/],
      ["2030 coverage", /DTSTART;VALUE=DATE:2030/],
    ];

    for (const [name, pattern] of requiredPatterns) {
      if (!pattern.test(content)) {
        errors.push(`${label}: missing ${name}`);
      }
    }

    if (
      countMatches(content, /BEGIN:VEVENT/g) !==
      feed.eventCount
    ) {
      errors.push(
        `${label}: manifest event count does not match`,
      );
    }

    validateCrLfAndLineLength(label, content);
    validateEvents(label, content, feed.eventCount);
    validatePublicHolidayScope({
      code: feed.bundeslandCode,
      fileName: label,
      content,
    });
  }


}

if (errors.length > 0) {
  console.error("\nSubscription calendar validation failed:");

  for (const error of errors) {
    console.error(`- ${error}`);
  }

  process.exit(1);
}

console.log(
  "✅ Subscription calendars validated " +
    "(16 feeds, 2026–2030).",
);
