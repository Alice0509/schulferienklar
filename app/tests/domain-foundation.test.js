import test from "node:test";
import assert from "node:assert/strict";

import {
  addDaysToDateKey,
  daysBetween,
  formatBasicDate,
  isWeekend,
  parseDateKey,
  rangesOverlap,
  toDateKey,
} from "../src/domain/date.js";
import {
  getSchoolEventCategoryLabel,
  isPublicHolidayEvent,
  isSchoolHolidayEvent,
  isStateSchoolFreeDay,
} from "../src/domain/event-types.js";
import { generateIcsCalendar } from "../src/utils/ics.js";

test("date helpers preserve calendar-day semantics", () => {
  assert.equal(toDateKey(parseDateKey("2027-03-28")), "2027-03-28");
  assert.equal(addDaysToDateKey("2027-12-31", 1), "2028-01-01");
  assert.equal(addDaysToDateKey("2028-02-28", 1), "2028-02-29");
  assert.equal(formatBasicDate("2027-08-02"), "20270802");
  assert.equal(daysBetween("2027-03-27", "2027-03-29"), 2);
});

test("date helpers identify weekends and overlapping periods", () => {
  assert.equal(isWeekend("2027-05-01"), true);
  assert.equal(isWeekend("2027-05-03"), false);

  assert.equal(
    rangesOverlap(
      "2027-03-22",
      "2027-04-02",
      "2027-03-26",
      "2027-03-26",
    ),
    true,
  );

  assert.equal(
    rangesOverlap(
      "2027-03-22",
      "2027-04-02",
      "2027-04-03",
      "2027-04-04",
    ),
    false,
  );
});

test("invalid date keys are rejected", () => {
  assert.throws(() => parseDateKey("2027-02-30"), /Invalid date key/);
  assert.throws(() => parseDateKey("02.03.2027"), /Invalid date key/);
});

test("event classifier recognizes current and legacy school-free categories", () => {
  assert.equal(
    isStateSchoolFreeDay({ category: "state_school_free_day" }),
    true,
  );

  assert.equal(isStateSchoolFreeDay({ category: "school_free" }), true);
  assert.equal(isSchoolHolidayEvent({ category: "school_holiday" }), true);
  assert.equal(isPublicHolidayEvent({ type: "public_holiday" }), true);

  assert.equal(
    getSchoolEventCategoryLabel(
      { category: "state_school_free_day" },
      "de",
    ),
    "Unterrichtsfrei",
  );
});

test("ICS labels state school-free days correctly", () => {
  const content = generateIcsCalendar({
    selectedCode: "BY",
    selectedYear: 2027,
    holidays: [
      {
        id: "by-all-saints-2027",
        category: "state_school_free_day",
        name: {
          de: "Unterrichtsfreie Tage um Allerheiligen",
        },
        startDate: "2027-11-02",
        endDate: "2027-11-05",
      },
    ],
    publicHolidays: [],
  });

  assert.match(
    content,
    /SUMMARY:Unterrichtsfreie Tage um Allerheiligen \(Unterrichtsfrei\)/,
  );

  assert.doesNotMatch(
    content,
    /SUMMARY:Unterrichtsfreie Tage um Allerheiligen \(Schulferien\)/,
  );

  assert.match(content, /DTSTART;VALUE=DATE:20271102/);
  assert.match(content, /DTEND;VALUE=DATE:20271106/);
});
