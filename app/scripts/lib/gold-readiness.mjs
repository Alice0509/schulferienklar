import {
  nodeHolidayRepository,
} from "./node-data-repository.mjs";

import {
  STATES,
} from "./site-config.mjs";

export function normalizeGoldReadinessYear(value) {
  const year = Number(value);

  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100
  ) {
    return null;
  }

  return year;
}

export function schoolYearLabel(startYear) {
  return (
    `${startYear}/` +
    String(startYear + 1).slice(-2)
  );
}

function toStringList(value) {
  if (Array.isArray(value)) {
    return value.flatMap(
      (item) => toStringList(item),
    );
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

export function evaluateGoldReadiness(
  yearInput,
  {
    repository = nodeHolidayRepository,
    states = STATES,
  } = {},
) {
  const year =
    normalizeGoldReadinessYear(
      yearInput,
    );

  if (year === null) {
    throw new RangeError(
      "Gold readiness year must be an integer between 2000 and 2100.",
    );
  }

  const yearStart =
    `${year}-01-01`;

  const yearEnd =
    `${year}-12-31`;

  const earlySchoolYear =
    schoolYearLabel(
      year - 1,
    );

  const lateSchoolYear =
    schoolYearLabel(
      year,
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
        String(year),
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
    of states
  ) {
    const blockers = [];
    const warnings = [];

    const meta =
      repository
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
      repository
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
        `keine Termine für ${year}`,
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
          `keine ${year}-Termine aus Schuljahr ${requiredSchoolYear}`,
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
        `Sommerferien ${year} fehlen`,
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
        `${lateSchoolYear} fehlen im Kalenderjahr ${year}`,
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

  const readyCount =
    results.filter(
      (result) =>
        result.blockers.length === 0,
    ).length;

  return {
    year,
    yearStart,
    yearEnd,
    earlySchoolYear,
    lateSchoolYear,
    results,
    readyCount,
    totalStates: results.length,
    isReady:
      readyCount ===
      results.length,
  };
}

export function categorizeGoldReadinessBlocker(
  blocker,
  yearInput,
) {
  const year =
    normalizeGoldReadinessYear(
      yearInput,
    );

  if (
    blocker.startsWith(
      "Quellenabdeckung fehlt:",
    )
  ) {
    return "Quellenabdeckung fehlt";
  }

  if (
    year !== null &&
    blocker.startsWith(
      `keine ${year}-Termine aus Schuljahr`,
    )
  ) {
    return "Schuljahr-Termine fehlen";
  }

  if (
    year !== null &&
    blocker.startsWith(
      `Sommerferien ${year} fehlen`,
    )
  ) {
    return "Sommerferien fehlen";
  }

  if (
    blocker.startsWith(
      "Weihnachtsferien aus Schuljahr",
    )
  ) {
    return "Weihnachtsferien fehlen";
  }

  if (
    blocker.startsWith(
      "Termin nicht verified:",
    )
  ) {
    return "nicht verified";
  }

  if (
    blocker.startsWith(
      "relevanter Partial-Hinweis:",
    )
  ) {
    return "Partial-Hinweis";
  }

  if (
    year !== null &&
    blocker.startsWith(
      `keine Termine für ${year}`,
    )
  ) {
    return "keine Termine";
  }

  return blocker;
}
