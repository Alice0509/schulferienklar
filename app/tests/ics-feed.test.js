import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";

import {
  foldIcsLine,
  generateIcsFeed,
} from "../src/domain/ics-feed.js";

test("subscription ICS keeps stable metadata and exclusive DTEND", () => {
  const content = generateIcsFeed({
    calendarName: "Schulferien Bayern",
    calendarDescription: "Offizielle Termine",
    sourceUrl: "https://www.schulferienklar.de/",
    updatedAt: "2026-05-24",
    events: [
      {
        uid: "by-summer-2026-27@schulferienklar.de",
        title: "Sommerferien",
        startDate: "2026-08-03",
        endDate: "2026-09-14",
        updatedAt: "2026-05-24",
        description: "Schulferienklar · Schulferien · Bayern",
      },
    ],
  });

  assert.match(
    content,
    /UID:by-summer-2026-27@schulferienklar\.de/,
  );
  assert.match(content, /DTSTART;VALUE=DATE:20260803/);
  assert.match(content, /DTEND;VALUE=DATE:20260915/);
  assert.match(content, /DTSTAMP:20260524T000000Z/);
  assert.match(content, /LAST-MODIFIED:20260524T000000Z/);
  assert.match(content, /SEQUENCE:20260524/);
  assert.match(
    content,
    /REFRESH-INTERVAL;VALUE=DURATION:PT12H/,
  );
  assert.ok(content.endsWith("\r\n"));
});

test("ICS text is escaped and output is deterministic", () => {
  const input = {
    calendarName: "Test, Kalender",
    updatedAt: "2026-05-25",
    events: [
      {
        uid: "test-event@schulferienklar.de",
        title: "Ferien; Test",
        startDate: "2027-01-01",
        endDate: "2027-01-01",
        description: "Erste Zeile\nZweite Zeile",
      },
    ],
  };

  const first = generateIcsFeed(input);
  const second = generateIcsFeed(input);

  assert.equal(first, second);
  assert.match(first, /X-WR-CALNAME:Test\\, Kalender/);
  assert.match(first, /SUMMARY:Ferien\\; Test/);
  assert.match(
    first,
    /DESCRIPTION:Erste Zeile\\nZweite Zeile/,
  );
});

test("folded ICS lines stay within 75 UTF-8 octets", () => {
  const folded = foldIcsLine(
    `DESCRIPTION:${"Ä".repeat(100)}`,
  );

  assert.match(folded, /\r\n /);

  for (const line of folded.split("\r\n")) {
    assert.ok(
      Buffer.byteLength(line, "utf8") <= 75,
      `Line exceeds 75 octets: ${line}`,
    );
  }
});

test("duplicate event UIDs are rejected", () => {
  assert.throws(
    () =>
      generateIcsFeed({
        calendarName: "Test",
        updatedAt: "2026-05-25",
        events: [
          {
            uid: "duplicate@schulferienklar.de",
            title: "A",
            startDate: "2026-01-01",
            endDate: "2026-01-01",
          },
          {
            uid: "duplicate@schulferienklar.de",
            title: "B",
            startDate: "2026-02-01",
            endDate: "2026-02-01",
          },
        ],
      }),
    /Duplicate event UID/,
  );
});
