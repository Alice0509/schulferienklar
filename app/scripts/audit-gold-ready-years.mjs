import {
  spawnSync,
} from "node:child_process";

import {
  fileURLToPath,
} from "node:url";

import {
  GOLD_PAGE_READY_YEARS,
} from "./lib/gold-page-config.mjs";

import {
  YEARS,
} from "./lib/site-config.mjs";

const readyYears =
  Array.from(
    GOLD_PAGE_READY_YEARS,
  ).sort(
    (a, b) => a - b,
  );

if (
  readyYears.length === 0
) {
  console.error(
    "❌ Keine freigegebenen Gold-Page-Jahre konfiguriert.",
  );

  process.exit(1);
}

const unsupportedYears =
  readyYears.filter(
    (year) => {
      return (
        !YEARS.includes(year)
      );
    },
  );

if (
  unsupportedYears.length > 0
) {
  console.error(
    "❌ Gold-Page-Jahre liegen außerhalb der konfigurierten Website-Jahre:",
    unsupportedYears.join(", "),
  );

  process.exit(1);
}

const auditScript =
  fileURLToPath(
    new URL(
      "./audit-gold-readiness.mjs",
      import.meta.url,
    ),
  );

console.log(
  "Gold Page readiness gate",
);

console.log(
  "Freigegebene Jahre:",
  readyYears.join(", "),
);

console.log();

const failedYears = [];

for (
  const year
  of readyYears
) {
  console.log(
    "=".repeat(72),
  );

  console.log(
    `Prüfe ${year}`,
  );

  console.log(
    "=".repeat(72),
  );

  const result =
    spawnSync(
      process.execPath,
      [
        auditScript,
        String(year),
      ],
      {
        stdio: "inherit",
      },
    );

  if (
    result.error ||
    result.status !== 0
  ) {
    failedYears.push(
      year,
    );
  }

  console.log();
}

if (
  failedYears.length > 0
) {
  console.error(
    "❌ Gold Page readiness gate fehlgeschlagen für:",
    failedYears.join(", "),
  );

  process.exit(1);
}

console.log(
  `✅ Gold Page readiness gate bestanden (${readyYears.length}/${readyYears.length} Jahre).`,
);
