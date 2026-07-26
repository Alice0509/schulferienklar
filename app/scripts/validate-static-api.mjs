import fs from "node:fs";
import path from "node:path";

import {
  API_VERSION,
} from "../src/domain/api-v1.js";

const apiDir = path.resolve(
  "public",
  "api",
  "v1",
);

const allowedKinds = new Set([
  "school_holiday",
  "state_school_free_day",
  "public_holiday",
]);

function readJson(filePath) {
  return JSON.parse(
    fs.readFileSync(filePath, "utf8"),
  );
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function eventSortKey(event) {
  return [
    event.startDate,
    event.endDate,
    event.kind,
    event.id,
  ].join("|");
}

function validateEvents(
  document,
  {
    code,
    year,
    allowedResourceKinds,
  },
) {
  assert(
    Array.isArray(document.events),
    `${code} ${year}: events must be an array`,
  );

  assert(
    document.eventCount ===
      document.events.length,
    `${code} ${year}: eventCount mismatch`,
  );

  const sortKeys =
    document.events.map(eventSortKey);

  assert(
    JSON.stringify(sortKeys) ===
      JSON.stringify([...sortKeys].sort()),
    `${code} ${year}: events are not sorted`,
  );

  for (const event of document.events) {
    assert(
      typeof event.id === "string" &&
        event.id.length > 0,
      `${code} ${year}: invalid event id`,
    );

    assert(
      allowedKinds.has(event.kind),
      `${code} ${year}: invalid kind ${event.kind}`,
    );

    assert(
      allowedResourceKinds.has(event.kind),
      `${code} ${year}: unexpected kind ${event.kind}`,
    );

    assert(
      /^\d{4}-\d{2}-\d{2}$/.test(
        event.startDate,
      ),
      `${code} ${year}: invalid startDate`,
    );

    assert(
      /^\d{4}-\d{2}-\d{2}$/.test(
        event.endDate,
      ),
      `${code} ${year}: invalid endDate`,
    );

    assert(
      event.startDate <= event.endDate,
      `${code} ${year}: invalid date range`,
    );

    assert(
      event.stateCode === code,
      `${code} ${year}: stateCode mismatch`,
    );

    assert(
      event.source &&
        Object.hasOwn(event.source, "name") &&
        Object.hasOwn(event.source, "url") &&
        Object.hasOwn(
          event.source,
          "lastCheckedAt",
        ),
      `${code} ${year}: source metadata missing`,
    );
  }
}

assert(
  fs.existsSync(apiDir),
  "Static API directory is missing.",
);

const indexDocument = readJson(
  path.join(apiDir, "index.json"),
);

const statesDocument = readJson(
  path.join(apiDir, "states.json"),
);

assert(
  indexDocument.apiVersion === API_VERSION,
  "API index version mismatch.",
);

assert(
  statesDocument.apiVersion === API_VERSION,
  "States API version mismatch.",
);

assert(
  statesDocument.stateCount ===
    statesDocument.states.length,
  "States count mismatch.",
);

let combinationCount = 0;

for (const state of statesDocument.states) {
  for (const year of state.years) {
    combinationCount += 1;

    const schoolPath = path.join(
      apiDir,
      "holidays",
      state.code,
      `${year}.json`,
    );

    const publicPath = path.join(
      apiDir,
      "public-holidays",
      state.code,
      `${year}.json`,
    );

    const calendarPath = path.join(
      apiDir,
      "calendar",
      state.code,
      `${year}.json`,
    );

    for (const filePath of [
      schoolPath,
      publicPath,
      calendarPath,
    ]) {
      assert(
        fs.existsSync(filePath),
        `Missing API file: ${filePath}`,
      );
    }

    const schoolDocument =
      readJson(schoolPath);

    const publicDocument =
      readJson(publicPath);

    const calendarDocument =
      readJson(calendarPath);

    for (const document of [
      schoolDocument,
      publicDocument,
      calendarDocument,
    ]) {
      assert(
        document.apiVersion === API_VERSION,
        `${state.code} ${year}: API version mismatch`,
      );

      assert(
        document.state.code === state.code,
        `${state.code} ${year}: document state mismatch`,
      );

      assert(
        document.year === year,
        `${state.code} ${year}: document year mismatch`,
      );
    }

    validateEvents(schoolDocument, {
      code: state.code,
      year,
      allowedResourceKinds: new Set([
        "school_holiday",
        "state_school_free_day",
      ]),
    });

    validateEvents(publicDocument, {
      code: state.code,
      year,
      allowedResourceKinds: new Set([
        "public_holiday",
      ]),
    });

    validateEvents(calendarDocument, {
      code: state.code,
      year,
      allowedResourceKinds: allowedKinds,
    });

    assert(
      calendarDocument.eventCount ===
        schoolDocument.eventCount +
          publicDocument.eventCount,
      `${state.code} ${year}: calendar count mismatch`,
    );
  }
}

assert(
  indexDocument.calendarCount ===
    combinationCount,
  "API calendarCount mismatch.",
);

function collectJsonFiles(directory) {
  return fs
    .readdirSync(directory, {
      withFileTypes: true,
    })
    .flatMap((entry) => {
      const entryPath = path.join(
        directory,
        entry.name,
      );

      if (entry.isDirectory()) {
        return collectJsonFiles(entryPath);
      }

      return entry.name.endsWith(".json")
        ? [entryPath]
        : [];
    });
}

const jsonFiles = collectJsonFiles(apiDir);
const expectedFileCount =
  combinationCount * 3 + 2;

assert(
  jsonFiles.length === expectedFileCount,
  `Expected ${expectedFileCount} API files, ` +
    `found ${jsonFiles.length}.`,
);

console.log(
  `Checked ${jsonFiles.length} static API JSON files.`,
);

console.log(
  `✅ Static API v1 validation passed ` +
    `(${statesDocument.stateCount} states, ` +
    `${combinationCount} calendars).`,
);
