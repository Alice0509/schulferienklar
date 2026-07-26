import test from "node:test";
import assert from "node:assert/strict";

import {
  getVacationOptimizerSuggestions,
} from "../src/domain/vacation-optimizer.js";

function publicHoliday(
  id,
  date,
  name,
  includeInDefaultCalendar = true,
) {
  return {
    id,
    date,
    name: {
      de: name,
      en: name,
    },
    type: "public_holiday",
    scope: "statewide",
    includeInDefaultCalendar,
  };
}

test("Thursday holiday creates four free days with one vacation day", () => {
  const suggestions =
    getVacationOptimizerSuggestions(
      [
        publicHoliday(
          "holiday-thursday",
          "2027-05-06",
          "Feiertag",
        ),
      ],
      2027,
      1,
    );

  const result = suggestions.find(
    (item) => {
      return (
        item.startDate ===
          "2027-05-06" &&
        item.endDate ===
          "2027-05-09"
      );
    },
  );

  assert.ok(result);
  assert.equal(result.vacationDays, 1);
  assert.equal(result.freeDays, 4);
  assert.deepEqual(
    result.vacationDates,
    ["2027-05-07"],
  );
});

test("Tuesday holiday connects the previous weekend with one vacation day", () => {
  const suggestions =
    getVacationOptimizerSuggestions(
      [
        publicHoliday(
          "holiday-tuesday",
          "2027-06-15",
          "Feiertag",
        ),
      ],
      2027,
      1,
    );

  const result = suggestions.find(
    (item) => {
      return (
        item.startDate ===
          "2027-06-12" &&
        item.endDate ===
          "2027-06-15"
      );
    },
  );

  assert.ok(result);
  assert.deepEqual(
    result.vacationDates,
    ["2027-06-14"],
  );
  assert.equal(result.freeDays, 4);
});

test("Good Friday and Easter Monday produce ten free days with four vacation days", () => {
  const suggestions =
    getVacationOptimizerSuggestions(
      [
        publicHoliday(
          "good-friday",
          "2027-03-26",
          "Karfreitag",
        ),
        publicHoliday(
          "easter-monday",
          "2027-03-29",
          "Ostermontag",
        ),
      ],
      2027,
      4,
      {
        limit: 30,
      },
    );

  const result = suggestions.find(
    (item) => {
      return (
        item.startDate ===
          "2027-03-20" &&
        item.endDate ===
          "2027-03-29"
      );
    },
  );

  assert.ok(result);
  assert.equal(result.vacationDays, 4);
  assert.equal(result.freeDays, 10);
  assert.equal(
    result.publicHolidayCount,
    2,
  );
  assert.deepEqual(
    result.vacationDates,
    [
      "2027-03-22",
      "2027-03-23",
      "2027-03-24",
      "2027-03-25",
    ],
  );
});

test("non-default public holidays are treated as working days", () => {
  const suggestions =
    getVacationOptimizerSuggestions(
      [
        publicHoliday(
          "local-holiday",
          "2027-05-06",
          "Lokaler Feiertag",
          false,
        ),
      ],
      2027,
      1,
      {
        limit: 30,
      },
    );

  const result = suggestions.find(
    (item) => {
      return (
        item.startDate ===
          "2027-05-06" &&
        item.endDate ===
          "2027-05-09"
      );
    },
  );

  assert.equal(result, undefined);
});

test("optimizer respects budget, date cutoff and result limit", () => {
  const suggestions =
    getVacationOptimizerSuggestions(
      [],
      2027,
      2,
      {
        minStartDate: "2027-07-01",
        limit: 3,
      },
    );

  assert.equal(suggestions.length, 3);

  assert.equal(
    suggestions.every((item) => {
      return (
        item.vacationDays <= 2 &&
        item.endDate >= "2027-07-01"
      );
    }),
    true,
  );
});

test("optimizer rejects invalid vacation budgets", () => {
  assert.throws(
    () => {
      getVacationOptimizerSuggestions(
        [],
        2027,
        0,
      );
    },
    /between 1 and 30/,
  );

  assert.throws(
    () => {
      getVacationOptimizerSuggestions(
        [],
        2027,
        2.5,
      );
    },
    /between 1 and 30/,
  );
});
