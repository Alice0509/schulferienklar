import test from "node:test";
import assert from "node:assert/strict";
import { evaluateGoldReadiness } from "../scripts/lib/gold-readiness.mjs";
import { nodeHolidayRepository } from "../scripts/lib/node-data-repository.mjs";
import { getSchoolHolidayYearCoverage } from "../src/domain/school-holiday-coverage.js";

test("browser coverage agrees with publication readiness for all 80 calendars", () => {
  for (const year of [2026, 2027, 2028, 2029, 2030]) {
    const publication = evaluateGoldReadiness(year);
    for (const state of publication.results) {
      const meta = nodeHolidayRepository.findSchoolHolidayDatasetMeta(state.code);
      const dataset = nodeHolidayRepository.loadSchoolHolidayDatasetByMeta(meta);
      const coverage = getSchoolHolidayYearCoverage(dataset, year);
      assert.deepEqual(coverage.results, [state], `${state.code} ${year}`);
      assert.equal(coverage.isReady, state.blockers.length === 0);
    }
    assert.equal(publication.readyCount, year === 2030 ? 1 : 16);
  }
});

test("missing data and invalid years have unknown coverage", () => {
  assert.equal(getSchoolHolidayYearCoverage(null, 2030), null);
  assert.equal(getSchoolHolidayYearCoverage({}, "invalid"), null);
  assert.equal(getSchoolHolidayYearCoverage({}, 2030.5), null);
});

test("empty and unverified calendars never appear complete", () => {
  assert.equal(getSchoolHolidayYearCoverage({}, 2030).isReady, false);
  const meta = nodeHolidayRepository.findSchoolHolidayDatasetMeta("SH");
  const original = nodeHolidayRepository.loadSchoolHolidayDatasetByMeta(meta);
  const dataset = structuredClone(original);
  const event = dataset.holidays.find((item) => item.startDate.startsWith("2030"));
  event.status = "partial";
  const coverage = getSchoolHolidayYearCoverage(dataset, 2030);
  assert.equal(coverage.isReady, false);
  assert.ok(coverage.results[0].blockers.some((item) => item.startsWith("Termin nicht verified:")));
});
