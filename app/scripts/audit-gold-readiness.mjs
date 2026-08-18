import {
  nodeHolidayRepository,
} from "./lib/node-data-repository.mjs";

import {
  STATES,
} from "./lib/site-config.mjs";

const YEAR =
  Number(process.argv[2]);

if (
  !Number.isInteger(YEAR) ||
  YEAR < 2000 ||
  YEAR > 2100
) {
  console.error(
    "Usage: node scripts/audit-gold-readiness.mjs <year>",
  );
  process.exit(2);
}

function schoolYearLabel(startYear) {
  return (
    `${startYear}/` +
    String(startYear + 1).slice(-2)
  );
}

function toStringList(value) {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => toStringList(item));
  }

  if (
    value === null ||
    value === undefined
  ) {
    return [];
  }

  return [
    String(value),
  ];
}

const yearStart =
  `${YEAR}-01-01`;

const yearEnd =
  `${YEAR}-12-31`;

const earlySchoolYear =
  schoolYearLabel(
    YEAR - 1,
  );

const lateSchoolYear =
  schoolYearLabel(
    YEAR,
  );

function overlapsTargetYear(event) {
  return (
    event?.startDate <= yearEnd &&
    event?.endDate >= yearStart
  );
}

function partialNoteIsRelevant(note) {
  const text =
    String(note || "");

  return (
    text.includes(
      String(YEAR),
    ) ||
    text.includes(
      earlySchoolYear,
    ) ||
    text.includes(
      lateSchoolYear,
    )
  );
}

const results = [];

for (
  const [
    ,
    name,
    ,
    code,
  ]
  of STATES
) {
  const blockers = [];
  const warnings = [];

  const meta =
    nodeHolidayRepository
      .findSchoolHolidayDatasetMeta(
        code,
      );

  if (!meta) {
    blockers.push(
      "kein Datensatz im Holiday-Index",
    );

    results.push({
      code,
      name,
      blockers,
      warnings,
      eventCount: 0,
    });

    continue;
  }

  const dataset =
    nodeHolidayRepository
      .loadSchoolHolidayDatasetByMeta(
        meta,
      );

  if (!dataset) {
    blockers.push(
      "Datensatz konnte nicht geladen werden",
    );

    results.push({
      code,
      name,
      blockers,
      warnings,
      eventCount: 0,
    });

    continue;
  }

  const events =
    dataset.holidays ||
    dataset.events ||
    [];

  const overlappingEvents =
    events.filter(
      overlapsTargetYear,
    );

  const source =
    dataset.sources?.[0] ||
    null;

  if (!source) {
    blockers.push(
      "keine Quellen-Metadaten",
    );
  } else {
    if (
      source.trustLevel &&
      source.trustLevel !==
        "official"
    ) {
      blockers.push(
        `Quelle ist nicht als official markiert (${source.trustLevel})`,
      );
    }

    if (!source.lastCheckedAt) {
      warnings.push(
        "lastCheckedAt fehlt",
      );
    }
  }

  const availableSchoolYears =
    Array.isArray(
      source?.availableSchoolYears,
    )
      ? source.availableSchoolYears
      : [];

  for (
    const requiredSchoolYear
    of [
      earlySchoolYear,
      lateSchoolYear,
    ]
  ) {
    if (
      !availableSchoolYears.includes(
        requiredSchoolYear,
      )
    ) {
      blockers.push(
        `Quellenabdeckung fehlt: ${requiredSchoolYear}`,
      );
    }
  }

  if (
    overlappingEvents.length === 0
  ) {
    blockers.push(
      `keine Termine für ${YEAR}`,
    );
  }

  const representedSchoolYears =
    new Set(
      overlappingEvents
        .map(
          (event) =>
            event.schoolYear,
        )
        .filter(Boolean),
    );

  for (
    const requiredSchoolYear
    of [
      earlySchoolYear,
      lateSchoolYear,
    ]
  ) {
    if (
      !representedSchoolYears.has(
        requiredSchoolYear,
      )
    ) {
      blockers.push(
        `keine ${YEAR}-Termine aus Schuljahr ${requiredSchoolYear}`,
      );
    }
  }

  const summerEvents =
    overlappingEvents.filter(
      (event) => {
        return (
          event.type === "summer" &&
          event.startDate >= yearStart &&
          event.startDate <= yearEnd
        );
      },
    );

  if (summerEvents.length === 0) {
    blockers.push(
      `Sommerferien ${YEAR} fehlen`,
    );
  }

  const lateChristmasEvents =
    overlappingEvents.filter(
      (event) => {
        return (
          event.type === "christmas" &&
          event.schoolYear ===
            lateSchoolYear &&
          event.startDate >=
            yearStart &&
          event.startDate <=
            yearEnd
        );
      },
    );

  if (
    lateChristmasEvents.length === 0
  ) {
    blockers.push(
      `Weihnachtsferien aus Schuljahr ` +
      `${lateSchoolYear} fehlen im Kalenderjahr ${YEAR}`,
    );
  }

  const nonVerifiedEvents =
    overlappingEvents.filter(
      (event) => {
        return (
          event.status !==
          "verified"
        );
      },
    );

  for (
    const event
    of nonVerifiedEvents
  ) {
    blockers.push(
      `Termin nicht verified: ` +
      `${event.id || event.type || "unbekannt"} ` +
      `(${event.status || "kein Status"})`,
    );
  }

  const partialNotes = [
    ...toStringList(
      dataset.longRangePartial,
    ),
    ...toStringList(
      source?.longRangePartial,
    ),
  ].filter(
    partialNoteIsRelevant,
  );

  for (
    const note
    of partialNotes
  ) {
    blockers.push(
      `relevanter Partial-Hinweis: ${note}`,
    );
  }

  results.push({
    code,
    name,
    blockers,
    warnings,
    eventCount:
      overlappingEvents.length,
  });
}

console.log(
  `Gold Page readiness ${YEAR}`,
);

console.log(
  `Benötigte Schuljahre: ` +
  `${earlySchoolYear} + ${lateSchoolYear}`,
);

console.log();

let readyCount = 0;

for (const result of results) {
  if (
    result.blockers.length === 0
  ) {
    readyCount += 1;

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
  `Ready: ${readyCount}/${STATES.length}`,
);

if (
  readyCount !==
  STATES.length
) {
  console.error(
    `❌ ${YEAR} ist noch nicht bereit für eine vollständige Gold-Page-Freigabe.`,
  );

  process.exit(1);
}

console.log(
  `✅ ${YEAR} ist für Gold Pages bereit.`,
);
