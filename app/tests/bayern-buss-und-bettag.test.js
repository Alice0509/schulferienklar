import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { nodeHolidayRepository } from "../scripts/lib/node-data-repository.mjs";
import {
  getSchoolEventCategoryLabel,
  isPublicHolidayEvent,
  isSchoolHolidayEvent,
  isStateSchoolFreeDay,
} from "../src/domain/event-types.js";

const expectedDates = new Map([
  [2025, "2025-11-19"],
  [2026, "2026-11-18"],
  [2027, "2027-11-17"],
  [2028, "2028-11-22"],
  [2029, "2029-11-21"],
  [2030, "2030-11-20"],
]);

test("Bavaria Buß- und Bettag has no classes, but is not a statutory public holiday", () => {
  const index = nodeHolidayRepository.loadSchoolHolidayIndex();
  const meta = nodeHolidayRepository.findSchoolHolidayDatasetMeta("BY");
  const dataset = nodeHolidayRepository.loadSchoolHolidayDatasetByMeta(meta);

  assert.equal(meta.eventCount, dataset.holidays.length);
  assert.equal(index.totalEvents, index.datasets.reduce((count, item) => count + item.eventCount, 0));

  for (const [year, date] of expectedDates) {
    const event = dataset.holidays.find((item) => item.startDate === date && item.type === "buss_und_bettag");
    assert.ok(event, `Missing Buß- und Bettag in ${year}`);
    assert.equal(event.endDate, date);
    assert.equal(event.category, "state_school_free_day");
    assert.equal(event.includeInDefaultCalendar, true);
    assert.equal(event.status, "verified");
    assert.equal(event.schoolYear, `${year}/${String(year + 1).slice(-2)}`);
    assert.equal(isStateSchoolFreeDay(event), true);
    assert.equal(isSchoolHolidayEvent(event), false);
    assert.equal(isPublicHolidayEvent(event), false);
    assert.equal(getSchoolEventCategoryLabel(event, "de"), "Unterrichtsfrei");

    const publicDataset = nodeHolidayRepository.loadPublicHolidayDataset("BY", year);
    assert.ok(publicDataset);
    assert.equal(
      publicDataset.holidays.some((item) => item.date === date && item.includeInDefaultCalendar),
      false,
      `Buß- und Bettag must not count as a public holiday in Bayern ${year}`,
    );
  }
});

test("Bavaria public and app holiday dataset copies stay in sync", () => {
  const appDataset = fs.readFileSync(
    new URL("../public/data/holidays/bayern_v0_4.json", import.meta.url),
    "utf8",
  );
  const sourceDataset = fs.readFileSync(
    new URL("../../data/holidays/bayern_v0_4.json", import.meta.url),
    "utf8",
  );
  assert.equal(appDataset, sourceDataset);
});
