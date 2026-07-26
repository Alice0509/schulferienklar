import fs from "node:fs";
import path from "node:path";

import {
  buildApiIndexDocument,
  buildCalendarDocument,
  buildPublicHolidayDocument,
  buildSchoolHolidayDocument,
  buildStatesDocument,
} from "../src/domain/api-v1.js";
import {
  nodeHolidayRepository,
} from "./lib/node-data-repository.mjs";

const publicDir = path.resolve("public");
const outputDir = path.join(
  publicDir,
  "api",
  "v1",
);

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), {
    recursive: true,
  });

  fs.writeFileSync(
    filePath,
    `${JSON.stringify(data, null, 2)}\n`,
    "utf8",
  );
}

function latestTimestamp(...values) {
  return values
    .filter(Boolean)
    .map(String)
    .sort()
    .at(-1) || null;
}

const schoolIndex =
  nodeHolidayRepository.loadSchoolHolidayIndex();

const publicIndex =
  nodeHolidayRepository.loadPublicHolidayIndex();

const generatedAt = latestTimestamp(
  schoolIndex.generatedAt,
  publicIndex.generatedAt,
);

const schoolMetaByCode = new Map(
  (schoolIndex.datasets || []).map((meta) => {
    return [meta.bundeslandCode, meta];
  }),
);

const combinations = (
  publicIndex.datasets || []
)
  .map((meta) => {
    const schoolMeta = schoolMetaByCode.get(
      meta.bundeslandCode,
    );

    return {
      code: meta.bundeslandCode,
      name:
        schoolMeta?.bundeslandName ||
        meta.bundeslandName,
      year: Number(meta.year),
      publicMeta: meta,
    };
  })
  .sort((a, b) => {
    return (
      a.code.localeCompare(b.code) ||
      a.year - b.year
    );
  });

const stateMap = new Map();

for (const combination of combinations) {
  const {
    code,
    name,
    year,
    publicMeta,
  } = combination;

  const state = {
    code,
    name,
  };

  const schoolDataset =
    nodeHolidayRepository
      .loadSchoolHolidayDataset(code);

  const publicDataset =
    nodeHolidayRepository
      .loadPublicHolidayDatasetByMeta(
        publicMeta,
      );

  if (!publicDataset) {
    throw new Error(
      `Public holiday dataset missing: ${code} ${year}`,
    );
  }

  const schoolDocument =
    buildSchoolHolidayDocument({
      state,
      year,
      dataset: schoolDataset,
      generatedAt,
    });

  const publicDocument =
    buildPublicHolidayDocument({
      state,
      year,
      dataset: publicDataset,
      generatedAt,
    });

  const calendarDocument =
    buildCalendarDocument({
      state,
      year,
      schoolDocument,
      publicDocument,
      generatedAt,
    });

  writeJson(
    path.join(
      outputDir,
      "holidays",
      code,
      `${year}.json`,
    ),
    schoolDocument,
  );

  writeJson(
    path.join(
      outputDir,
      "public-holidays",
      code,
      `${year}.json`,
    ),
    publicDocument,
  );

  writeJson(
    path.join(
      outputDir,
      "calendar",
      code,
      `${year}.json`,
    ),
    calendarDocument,
  );

  if (!stateMap.has(code)) {
    stateMap.set(code, {
      code,
      name,
      years: new Set(),
    });
  }

  stateMap.get(code).years.add(year);
}

const statesDocument = buildStatesDocument({
  states: [...stateMap.values()],
  generatedAt,
});

const indexDocument = buildApiIndexDocument({
  statesDocument,
  generatedAt,
});

writeJson(
  path.join(outputDir, "states.json"),
  statesDocument,
);

writeJson(
  path.join(outputDir, "index.json"),
  indexDocument,
);

console.log(
  `created static API v1: ` +
    `${statesDocument.stateCount} states, ` +
    `${indexDocument.calendarCount} state-year calendars, ` +
    `${indexDocument.calendarCount * 3 + 2} JSON files`,
);
