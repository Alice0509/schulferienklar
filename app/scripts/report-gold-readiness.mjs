import {
  categorizeGoldReadinessBlocker,
  evaluateGoldReadiness,
  normalizeGoldReadinessYear,
} from "./lib/gold-readiness.mjs";

const YEAR =
  normalizeGoldReadinessYear(
    process.argv[2],
  );

if (YEAR === null) {
  console.error(
    "Usage: node scripts/report-gold-readiness.mjs <year>",
  );
  process.exit(2);
}

const summary =
  evaluateGoldReadiness(
    YEAR,
  );

const categoryCounts =
  new Map();

for (
  const result
  of summary.results
) {
  for (
    const blocker
    of result.blockers
  ) {
    const category =
      categorizeGoldReadinessBlocker(
        blocker,
        YEAR,
      );

    categoryCounts.set(
      category,
      (
        categoryCounts.get(
          category,
        ) || 0
      ) + 1,
    );
  }
}

const categories =
  [...categoryCounts.entries()]
    .sort(
      (a, b) => {
        if (b[1] !== a[1]) {
          return b[1] - a[1];
        }

        return a[0].localeCompare(
          b[0],
          "de",
        );
      },
    );

console.log(
  `Gold Page readiness summary ${YEAR}`,
);

console.log(
  `Benötigte Schuljahre: ` +
  `${summary.earlySchoolYear} + ${summary.lateSchoolYear}`,
);

console.log(
  `Ready: ${summary.readyCount}/${summary.totalStates}`,
);

console.log(
  `Blocked: ` +
  `${summary.totalStates - summary.readyCount}/${summary.totalStates}`,
);

console.log();
console.log(
  "Blocker-Kategorien:",
);

if (categories.length === 0) {
  console.log(
    "Keine Blocker.",
  );
} else {
  for (
    const [
      category,
      count,
    ]
    of categories
  ) {
    console.log(
      `${String(count).padStart(2)} × ${category}`,
    );
  }
}

console.log();
console.log(
  "Bundesländer:",
);

for (
  const result
  of summary.results
) {
  if (
    result.blockers.length === 0
  ) {
    console.log(
      `✓ ${result.code} ${result.name}` +
      ` · ${result.eventCount} Termine`,
    );

    continue;
  }

  const categoriesForState =
    [];

  const seen =
    new Set();

  for (
    const blocker
    of result.blockers
  ) {
    const category =
      categorizeGoldReadinessBlocker(
        blocker,
        YEAR,
      );

    if (!seen.has(category)) {
      seen.add(category);
      categoriesForState.push(
        category,
      );
    }
  }

  console.log(
    `✗ ${result.code} ${result.name}` +
    ` · ${result.eventCount} Termine` +
    ` · ${categoriesForState.join("; ")}`,
  );
}
