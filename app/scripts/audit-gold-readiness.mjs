import {
  evaluateGoldReadiness,
  normalizeGoldReadinessYear,
} from "./lib/gold-readiness.mjs";

const YEAR =
  normalizeGoldReadinessYear(
    process.argv[2],
  );

if (YEAR === null) {
  console.error(
    "Usage: node scripts/audit-gold-readiness.mjs <year>",
  );
  process.exit(2);
}

const summary =
  evaluateGoldReadiness(
    YEAR,
  );

console.log(
  `Gold Page readiness ${YEAR}`,
);

console.log(
  `Benötigte Schuljahre: ` +
  `${summary.earlySchoolYear} + ${summary.lateSchoolYear}`,
);

console.log();

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

    for (
      const warning
      of result.warnings
    ) {
      console.log(
        `  ⚠ ${warning}`,
      );
    }

    continue;
  }

  console.log(
    `✗ ${result.code} ${result.name}` +
    ` · ${result.eventCount} Termine`,
  );

  for (
    const blocker
    of result.blockers
  ) {
    console.log(
      `  - ${blocker}`,
    );
  }

  for (
    const warning
    of result.warnings
  ) {
    console.log(
      `  ⚠ ${warning}`,
    );
  }
}

console.log();

console.log(
  `Ready: ${summary.readyCount}/${summary.totalStates}`,
);

if (!summary.isReady) {
  console.error(
    `❌ ${YEAR} ist noch nicht bereit für eine vollständige Gold-Page-Freigabe.`,
  );

  process.exit(1);
}

console.log(
  `✅ ${YEAR} ist für Gold Pages bereit.`,
);
