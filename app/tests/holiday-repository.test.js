import test from "node:test";
import assert from "node:assert/strict";

import { createHolidayRepository } from "../src/data/holiday-repository.js";

function createJsonResponse(data, ok = true) {
  return {
    ok,
    json: async () => data,
  };
}

test("browser repository builds base URLs and caches index requests", async () => {
  const calls = [];
  const index = {
    datasets: [
      {
        bundeslandCode: "BY",
        jsonFile: "bayern_v0_4.json",
      },
    ],
  };

  const repository = createHolidayRepository({
    baseUrl: "/schulferienklar/",
    fetchImpl: async (url) => {
      calls.push(url);
      return createJsonResponse(index);
    },
  });

  const [first, second] = await Promise.all([
    repository.loadSchoolHolidayIndex(),
    repository.loadSchoolHolidayIndex(),
  ]);

  assert.equal(first, index);
  assert.equal(second, index);
  assert.deepEqual(calls, [
    "/schulferienklar/data/holidays/index.json",
  ]);
});

test("browser repository loads datasets from metadata and reuses them", async () => {
  const calls = [];
  const dataset = {
    holidays: [
      {
        id: "by-summer-2027",
        startDate: "2027-08-02",
        endDate: "2027-09-13",
      },
    ],
  };

  const repository = createHolidayRepository({
    baseUrl: "/",
    fetchImpl: async (url) => {
      calls.push(url);
      return createJsonResponse(dataset);
    },
  });

  const meta = {
    jsonFile: "bayern_v0_4.json",
  };

  const first = await repository.loadSchoolHolidayDatasetByMeta(meta);
  const second = await repository.loadSchoolHolidayDatasetByMeta(meta);

  assert.equal(first, dataset);
  assert.equal(second, dataset);
  assert.deepEqual(calls, [
    "/data/holidays/bayern_v0_4.json",
  ]);

  assert.equal(
    await repository.loadSchoolHolidayDatasetByMeta(null),
    null,
  );
});

test("failed browser requests are removed from the cache and can retry", async () => {
  let requestCount = 0;

  const repository = createHolidayRepository({
    fetchImpl: async () => {
      requestCount += 1;

      if (requestCount === 1) {
        return createJsonResponse(null, false);
      }

      return createJsonResponse({
        datasets: [],
      });
    },
  });

  await assert.rejects(
    repository.loadPublicHolidayIndex(),
    /Feiertagsindex konnte nicht geladen werden/,
  );

  const result = await repository.loadPublicHolidayIndex();

  assert.deepEqual(result, {
    datasets: [],
  });
  assert.equal(requestCount, 2);
});
