import test from "node:test";
import assert from "node:assert/strict";

import { getBridgeDaySuggestions } from "../src/domain/bridge-days.js";
import {
  getComparisonOverlapData,
  getOverlapMonthKeys,
} from "../src/domain/overlaps.js";
import {
  findPublicHolidayForDate,
  getEffectiveFreePeriod,
} from "../src/domain/periods.js";
import {
  getHolidaysForYear,
  getTravelPeriodMatches,
} from "../src/domain/travel-check.js";

test("effective free period connects weekends and public holidays", () => {
  const holiday = {
    startDate: "2027-05-10",
    endDate: "2027-05-14",
  };

  const publicHolidays = [
    {
      date: "2027-05-17",
      includeInDefaultCalendar: true,
    },
  ];

  assert.deepEqual(
    getEffectiveFreePeriod(holiday, publicHolidays),
    {
      startDate: "2027-05-08",
      endDate: "2027-05-17",
      startsBeforeOfficialHoliday: true,
      endsAfterOfficialHoliday: true,
    },
  );

  assert.equal(
    findPublicHolidayForDate(
      "2027-05-17",
      publicHolidays,
    )?.date,
    "2027-05-17",
  );
});

test("travel matching includes only default public holidays", () => {
  const schoolHoliday = {
    id: "school-1",
    startDate: "2027-03-22",
    endDate: "2027-04-02",
  };

  const publicHoliday = {
    id: "public-1",
    date: "2027-03-26",
    includeInDefaultCalendar: true,
  };

  const regionalHoliday = {
    id: "public-regional",
    date: "2027-03-27",
    includeInDefaultCalendar: false,
  };

  const matches = getTravelPeriodMatches(
    "2027-03-25",
    "2027-03-28",
    [schoolHoliday],
    [publicHoliday, regionalHoliday],
  );

  assert.deepEqual(
    matches.schoolHolidayMatches.map((item) => item.id),
    ["school-1"],
  );

  assert.deepEqual(
    matches.publicHolidayMatches.map((item) => item.id),
    ["public-1"],
  );
});

test("year filtering keeps holidays crossing calendar-year boundaries", () => {
  const holidays = [
    {
      id: "christmas",
      startDate: "2026-12-24",
      endDate: "2027-01-08",
    },
    {
      id: "summer",
      startDate: "2027-08-02",
      endDate: "2027-09-13",
    },
    {
      id: "old",
      startDate: "2026-08-01",
      endDate: "2026-09-12",
    },
  ];

  assert.deepEqual(
    getHolidaysForYear(holidays, 2027).map(
      (holiday) => holiday.id,
    ),
    ["christmas", "summer"],
  );
});

test("bridge-day suggestions preserve the current Thursday pattern", () => {
  const suggestions = getBridgeDaySuggestions(
    [
      {
        id: "ascension",
        date: "2027-05-06",
        name: {
          de: "Christi Himmelfahrt",
        },
        includeInDefaultCalendar: true,
      },
    ],
    2027,
    "2027-01-01",
  );

  assert.deepEqual(suggestions, [
    {
      id: "2027-05-06-2027-05-07",
      holidayName: "Christi Himmelfahrt",
      holidayDate: "2027-05-06",
      bridgeDate: "2027-05-07",
      freeStartDate: "2027-05-06",
      freeEndDate: "2027-05-09",
      vacationDays: 1,
      freeDays: 4,
      direction: "nach dem Feiertag",
    },
  ]);
});

test("overlap calculation preserves state combinations and current-date cutoff", () => {
  const result = getComparisonOverlapData(
    [
      {
        code: "BY",
        name: "Bayern",
        holidaysForYear: [
          {
            startDate: "2027-03-22",
            endDate: "2027-04-02",
          },
        ],
      },
      {
        code: "NW",
        name: "Nordrhein-Westfalen",
        holidaysForYear: [
          {
            startDate: "2027-03-25",
            endDate: "2027-04-06",
          },
        ],
      },
      {
        code: "BE",
        name: "Berlin",
        holidaysForYear: [
          {
            startDate: "2027-03-28",
            endDate: "2027-03-30",
          },
        ],
      },
    ],
    2027,
    "2027-03-29",
  );

  assert.equal(
    Object.hasOwn(result.dayMap, "2027-03-28"),
    false,
  );

  assert.deepEqual(result.periods, [
    {
      startDate: "2027-03-29",
      endDate: "2027-03-30",
      states: [
        { code: "BY", name: "Bayern" },
        {
          code: "NW",
          name: "Nordrhein-Westfalen",
        },
        { code: "BE", name: "Berlin" },
      ],
    },
    {
      startDate: "2027-03-31",
      endDate: "2027-04-02",
      states: [
        { code: "BY", name: "Bayern" },
        {
          code: "NW",
          name: "Nordrhein-Westfalen",
        },
      ],
    },
  ]);

  assert.deepEqual(
    getOverlapMonthKeys(result.dayMap),
    ["2027-03", "2027-04"],
  );
});
