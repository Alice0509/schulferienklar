import {
  spawnSync,
} from "node:child_process";

import {
  fileURLToPath,
} from "node:url";

import {
  GOLD_PAGE_PUBLISHED_YEARS,
  GOLD_PAGE_READY_YEARS,
} from "./lib/gold-page-config.mjs";

import {
  YEARS,
} from "./lib/site-config.mjs";

const publishedYears =
  Array.from(
    GOLD_PAGE_PUBLISHED_YEARS,
  ).sort(
    (a, b) => a - b,
  );

const readyYears =
  Array.from(
    GOLD_PAGE_READY_YEARS,
  );

if (
  publishedYears.length === 0
) {
  console.error(
    "❌ Keine veröffentlichten Gold-Page-Jahre konfiguriert.",
  );

  process.exit(1);
}

const unsupportedYears =
  publishedYears.filter(
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
    "❌ Veröffentlichte Gold-Page-Jahre liegen außerhalb der konfigurierten Website-Jahre:",
    unsupportedYears.join(", "),
  );

  process.exit(1);
}

const unpublishedReadyYears =
  readyYears.filter(
    (year) => {
      return (
        !GOLD_PAGE_PUBLISHED_YEARS.has(
          year,
        )
      );
    },
  );

if (
  unpublishedReadyYears.length > 0
) {
  console.error(
    "❌ Freigegebene automatische Gold-Page-Jahre fehlen in GOLD_PAGE_PUBLISHED_YEARS:",
    unpublishedReadyYears.join(", "),
  );

  process.exit(1);
}

const auditScript =
  fileURLToPath(
    new URL(
      "./audit-gold-pages.mjs",
      import.meta.url,
    ),
  );

console.log(
  "Published Gold Page audit gate",
);

console.log(
  "Veröffentlichte Jahre:",
  publishedYears.join(", "),
);

console.log();

const failedYears = [];

for (
  const year
  of publishedYears
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
    "❌ Published Gold Page audit gate fehlgeschlagen für:",
    failedYears.join(", "),
  );

  process.exit(1);
}

console.log(
  `✅ Published Gold Page audit gate bestanden (${publishedYears.length}/${publishedYears.length} Jahre).`,
);
