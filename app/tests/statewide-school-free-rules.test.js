import test from "node:test";
import assert from "node:assert/strict";
import { nodeHolidayRepository } from "../scripts/lib/node-data-repository.mjs";

const stateCodes = ["BW", "BY", "BE", "BB", "HB", "HH", "HE", "MV", "NI", "NW", "RP", "SL", "SN", "ST", "SH", "TH"];

const repentanceDates = [
  "2026-11-18",
  "2027-11-17",
  "2028-11-22",
  "2029-11-21",
  "2030-11-20",
];

function schoolEvents(code) {
  return nodeHolidayRepository.loadSchoolHolidayDataset(code).holidays;
}

function publicEvents(code, year) {
  return nodeHolidayRepository.loadPublicHolidayDataset(code, year).holidays;
}

function coversDay(event, day) {
  return event.startDate <= day && event.endDate >= day;
}

test("Buß- und Bettag: only Bavaria is statewide school-free without public-holiday status", () => {
  for (const day of repentanceDates) {
    const year = Number(day.slice(0, 4));
    for (const code of stateCodes) {
      const statewideSchoolFree = schoolEvents(code).some(
        (event) => event.includeInDefaultCalendar === true && coversDay(event, day),
      );
      const statutoryPublicHoliday = publicEvents(code, year).some(
        (event) => event.date === day && event.includeInDefaultCalendar === true && event.scope === "statewide",
      );
      assert.equal(
        statewideSchoolFree,
        code === "BY",
        `${code} ${day}: statewide school-free classification mismatch`,
      );
      assert.equal(
        statutoryPublicHoliday,
        code === "SN",
        `${code} ${day}: statutory holiday classification mismatch`,
      );
    }
  }
});

test("Religious exemptions and vocational-school-only days are not incorrectly statewide", () => {
  assert.equal(schoolEvents("BE").some((e) => coversDay(e, "2026-11-18")), false);
  assert.equal(schoolEvents("MV").some((e) => coversDay(e, "2026-11-26")), false);
  assert.equal(schoolEvents("MV").some((e) => coversDay(e, "2026-11-27")), false);
});

test("Other officially statewide school-free exceptions in school year 2026/27 remain visible", () => {
  const bwEvents = schoolEvents("BW");
  for (const day of ["2026-10-31", "2027-03-25"]) {
    assert.ok(
      bwEvents.some((e) => e.category === "state_school_free_day" && coversDay(e, day) && e.includeInDefaultCalendar),
      `Baden-Württemberg ${day} missing`,
    );
  }
  const dayAfterAscension = "2027-05-07";
  for (const code of ["BE", "HB", "MV", "NI", "SN", "SH", "TH"]) {
    assert.ok(
      schoolEvents(code).some((e) => e.includeInDefaultCalendar && coversDay(e, dayAfterAscension)),
      `${code}: 2027-05-07 missing`,
    );
  }
  assert.ok(schoolEvents("HH").some((e) => e.includeInDefaultCalendar && coversDay(e, dayAfterAscension)));
});
