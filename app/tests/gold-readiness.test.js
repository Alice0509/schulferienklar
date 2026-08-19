import test from "node:test";
import assert from "node:assert/strict";

import {
  categorizeGoldReadinessBlocker,
  evaluateGoldReadiness,
} from "../scripts/lib/gold-readiness.mjs";

const TEST_STATES = [
  [
    "test",
    "Testland",
    "testland",
    "TT",
  ],
];

function repositoryFor(dataset) {
  return {
    findSchoolHolidayDatasetMeta(
      code,
    ) {
      if (code !== "TT") {
        return null;
      }

      return {
        bundeslandCode: "TT",
        jsonFile: "test.json",
      };
    },

    loadSchoolHolidayDatasetByMeta() {
      return dataset;
    },
  };
}

test(
  "gold readiness accepts a complete target year",
  () => {
    const dataset = {
      sources: [
        {
          trustLevel: "official",
          lastCheckedAt: "2026-08-19",
          availableSchoolYears: [
            "2029/30",
            "2030/31",
          ],
        },
      ],
      holidays: [
        {
          id: "tt-easter-2029-30",
          schoolYear: "2029/30",
          type: "easter",
          startDate: "2030-04-01",
          endDate: "2030-04-10",
          status: "verified",
        },
        {
          id: "tt-summer-2030-31",
          schoolYear: "2030/31",
          type: "summer",
          startDate: "2030-07-01",
          endDate: "2030-08-10",
          status: "verified",
        },
        {
          id: "tt-christmas-2030-31",
          schoolYear: "2030/31",
          type: "christmas",
          startDate: "2030-12-20",
          endDate: "2031-01-05",
          status: "verified",
        },
      ],
    };

    const summary =
      evaluateGoldReadiness(
        2030,
        {
          repository:
            repositoryFor(
              dataset,
            ),
          states: TEST_STATES,
        },
      );

    assert.equal(
      summary.readyCount,
      1,
    );

    assert.equal(
      summary.isReady,
      true,
    );

    assert.deepEqual(
      summary.results[0].blockers,
      [],
    );
  },
);

test(
  "gold readiness reports missing late school-year coverage",
  () => {
    const dataset = {
      sources: [
        {
          trustLevel: "official",
          lastCheckedAt: "2026-08-19",
          availableSchoolYears: [
            "2029/30",
          ],
        },
      ],
      holidays: [
        {
          id: "tt-easter-2029-30",
          schoolYear: "2029/30",
          type: "easter",
          startDate: "2030-04-01",
          endDate: "2030-04-10",
          status: "verified",
        },
      ],
    };

    const summary =
      evaluateGoldReadiness(
        2030,
        {
          repository:
            repositoryFor(
              dataset,
            ),
          states: TEST_STATES,
        },
      );

    assert.equal(
      summary.readyCount,
      0,
    );

    assert.ok(
      summary.results[0].blockers.includes(
        "Quellenabdeckung fehlt: 2030/31",
      ),
    );

    assert.ok(
      summary.results[0].blockers.includes(
        "keine 2030-Termine aus Schuljahr 2030/31",
      ),
    );

    assert.ok(
      summary.results[0].blockers.includes(
        "Sommerferien 2030 fehlen",
      ),
    );

    assert.ok(
      summary.results[0].blockers.some(
        (blocker) =>
          blocker.startsWith(
            "Weihnachtsferien aus Schuljahr 2030/31",
          ),
      ),
    );
  },
);

test(
  "gold readiness blocker categories stay stable",
  () => {
    assert.equal(
      categorizeGoldReadinessBlocker(
        "Quellenabdeckung fehlt: 2030/31",
        2030,
      ),
      "Quellenabdeckung fehlt",
    );

    assert.equal(
      categorizeGoldReadinessBlocker(
        "Termin nicht verified: tt-summer (partial)",
        2030,
      ),
      "nicht verified",
    );

    assert.equal(
      categorizeGoldReadinessBlocker(
        "relevanter Partial-Hinweis: Sommerferien 2030",
        2030,
      ),
      "Partial-Hinweis",
    );
  },
);
