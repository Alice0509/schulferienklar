import test from "node:test";
import assert from "node:assert/strict";

import {
  buildApiIndexDocument,
  buildCalendarDocument,
  buildPublicHolidayDocument,
  buildSchoolHolidayDocument,
  buildStatesDocument,
  normalizeSchoolHolidayEvent,
} from "../src/domain/api-v1.js";

const state = {
  code: "BY",
  name: "Bayern",
};

test("API normalizes legacy school-free categories", () => {
  const event = normalizeSchoolHolidayEvent(
    {
      id: "by-school-free",
      category: "school_free",
      name: {
        de: "Unterrichtsfrei",
        en: "School-free day",
      },
      startDate: "2027-11-17",
      endDate: "2027-11-17",
      bundeslandCode: "BY",
      bundeslandName: "Bayern",
    },
    {
      state,
      dataset: {
        sources: [],
      },
    },
  );

  assert.equal(
    event.kind,
    "state_school_free_day",
  );

  assert.equal(
    event.includeInDefaultCalendar,
    true,
  );
});

test("school API keeps events crossing calendar-year boundaries", () => {
  const document = buildSchoolHolidayDocument({
    state,
    year: 2027,
    generatedAt: "2026-07-26",
    dataset: {
      version: "0.4",
      sources: [
        {
          sourceName: "Official source",
          sourceUrl: "https://example.test",
          lastCheckedAt: "2026-05-24",
        },
      ],
      holidays: [
        {
          id: "christmas-cross-year",
          category: "school_holiday",
          type: "christmas",
          name: {
            de: "Weihnachtsferien",
            en: "Christmas holidays",
          },
          startDate: "2026-12-24",
          endDate: "2027-01-08",
          bundeslandCode: "BY",
          bundeslandName: "Bayern",
        },
        {
          id: "outside-2027",
          category: "school_holiday",
          type: "summer",
          name: {
            de: "Sommerferien",
            en: "Summer holidays",
          },
          startDate: "2028-08-01",
          endDate: "2028-09-12",
          bundeslandCode: "BY",
          bundeslandName: "Bayern",
        },
      ],
    },
  });

  assert.equal(document.eventCount, 1);
  assert.equal(
    document.events[0].id,
    "christmas-cross-year",
  );
  assert.equal(
    document.events[0].source.name,
    "Official source",
  );
});

test("calendar API merges and sorts school and public holidays", () => {
  const schoolDocument =
    buildSchoolHolidayDocument({
      state,
      year: 2027,
      dataset: {
        version: "0.4",
        holidays: [
          {
            id: "school-event",
            category: "school_holiday",
            type: "winter",
            name: {
              de: "Winterferien",
              en: "Winter holidays",
            },
            startDate: "2027-01-04",
            endDate: "2027-01-08",
            bundeslandCode: "BY",
            bundeslandName: "Bayern",
          },
        ],
      },
    });

  const publicDocument =
    buildPublicHolidayDocument({
      state,
      year: 2027,
      dataset: {
        version: "0.1",
        holidays: [
          {
            id: "new-year",
            type: "public_holiday",
            name: {
              de: "Neujahr",
              en: "New Year's Day",
            },
            date: "2027-01-01",
            scope: "statewide",
            includeInDefaultCalendar: true,
          },
        ],
      },
    });

  const calendarDocument =
    buildCalendarDocument({
      state,
      year: 2027,
      schoolDocument,
      publicDocument,
    });

  assert.equal(
    calendarDocument.eventCount,
    2,
  );

  assert.deepEqual(
    calendarDocument.events.map(
      (event) => event.id,
    ),
    [
      "new-year",
      "school-event",
    ],
  );
});

test("API index exposes state-year coverage", () => {
  const statesDocument =
    buildStatesDocument({
      generatedAt: "2026-07-26",
      states: [
        {
          code: "BY",
          name: "Bayern",
          years: new Set([
            2026,
            2027,
          ]),
        },
        {
          code: "NW",
          name: "Nordrhein-Westfalen",
          years: new Set([
            2027,
          ]),
        },
      ],
    });

  const indexDocument =
    buildApiIndexDocument({
      statesDocument,
      generatedAt: "2026-07-26",
    });

  assert.equal(
    statesDocument.stateCount,
    2,
  );

  assert.equal(
    indexDocument.calendarCount,
    3,
  );

  assert.deepEqual(
    indexDocument.years,
    [
      2026,
      2027,
    ],
  );
});
