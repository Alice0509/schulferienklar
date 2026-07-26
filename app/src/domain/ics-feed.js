import {
  addDaysToDateKey,
  formatBasicDate,
  toDateKey,
} from "./date.js";

const textEncoder = new TextEncoder();

function byteLength(value) {
  return textEncoder.encode(String(value)).length;
}

function requireText(value, fieldName) {
  const normalized = String(value || "").trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
}

function formatIcsTimestamp(value) {
  const dateKey = toDateKey(value);

  return `${formatBasicDate(dateKey)}T000000Z`;
}

function revisionSequence(value) {
  return Number(formatBasicDate(toDateKey(value)));
}

export function escapeIcsText(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,");
}

export function foldIcsLine(value) {
  let remaining = String(value);
  const lines = [];
  let continuation = false;

  while (remaining.length > 0) {
    const byteLimit = continuation ? 74 : 75;
    let chunk = "";

    for (const character of remaining) {
      if (byteLength(chunk + character) > byteLimit) {
        break;
      }

      chunk += character;
    }

    if (!chunk) {
      const [character] = [...remaining];
      chunk = character;
    }

    lines.push(continuation ? ` ${chunk}` : chunk);
    remaining = remaining.slice(chunk.length);
    continuation = true;
  }

  return lines.length > 0 ? lines.join("\r\n") : "";
}

function createEventLines(event, defaultUpdatedAt) {
  const uid = requireText(event.uid, "Event UID");
  const title = requireText(event.title, "Event title");
  const startDate = toDateKey(event.startDate);
  const endDate = toDateKey(event.endDate);

  if (endDate < startDate) {
    throw new Error(
      `Event end date must not precede start date: ${uid}`,
    );
  }

  const updatedAt = toDateKey(
    event.updatedAt || defaultUpdatedAt,
  );
  const timestamp = formatIcsTimestamp(updatedAt);

  const lines = [
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(uid)}`,
    `DTSTAMP:${timestamp}`,
    `LAST-MODIFIED:${timestamp}`,
    `SEQUENCE:${revisionSequence(updatedAt)}`,
    `DTSTART;VALUE=DATE:${formatBasicDate(startDate)}`,
    `DTEND;VALUE=DATE:${formatBasicDate(
      addDaysToDateKey(endDate, 1),
    )}`,
    `SUMMARY:${escapeIcsText(title)}`,
  ];

  if (event.description) {
    lines.push(
      `DESCRIPTION:${escapeIcsText(event.description)}`,
    );
  }

  if (event.url) {
    lines.push(`URL:${String(event.url)}`);
  }

  lines.push(
    "STATUS:CONFIRMED",
    "TRANSP:TRANSPARENT",
    "END:VEVENT",
  );

  return lines;
}

export function generateIcsFeed({
  calendarName,
  calendarDescription = "",
  sourceUrl = "",
  updatedAt,
  events = [],
  productId =
    "-//Schulferienklar//Subscription Calendar//DE",
  refreshInterval = "PT12H",
}) {
  const normalizedName = requireText(
    calendarName,
    "Calendar name",
  );
  const normalizedUpdatedAt = toDateKey(updatedAt);
  const seenUids = new Set();

  const sortedEvents = [...events].sort((a, b) => {
    return (
      String(a.startDate).localeCompare(String(b.startDate)) ||
      String(a.endDate).localeCompare(String(b.endDate)) ||
      String(a.uid).localeCompare(String(b.uid))
    );
  });

  for (const event of sortedEvents) {
    const uid = requireText(event.uid, "Event UID");

    if (seenUids.has(uid)) {
      throw new Error(`Duplicate event UID: ${uid}`);
    }

    seenUids.add(uid);
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${productId}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(normalizedName)}`,
    `X-WR-CALDESC:${escapeIcsText(calendarDescription)}`,
    `REFRESH-INTERVAL;VALUE=DURATION:${refreshInterval}`,
    `X-PUBLISHED-TTL:${refreshInterval}`,
  ];

  if (sourceUrl) {
    lines.push(`URL:${String(sourceUrl)}`);
  }

  for (const event of sortedEvents) {
    lines.push(
      ...createEventLines(
        event,
        normalizedUpdatedAt,
      ),
    );
  }

  lines.push("END:VCALENDAR");

  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}
