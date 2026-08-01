import fs from "node:fs";
import path from "node:path";

import {
  STATES,
  YEARS,
  getStateYearCombinations,
} from "./lib/site-config.mjs";

const appDir = process.cwd();
const publicDir = path.join(appDir, "public");
const errors = [];

const combinations =
  getStateYearCombinations();

const expectedCodes = STATES
  .map(([, , , code]) => code)
  .sort();

const expectedYears = [...YEARS].sort();

function publicPath(relativePath) {
  return path.join(publicDir, relativePath);
}

function expectPublicFile(relativePath) {
  const filePath = publicPath(relativePath);

  if (!fs.existsSync(filePath)) {
    errors.push(
      `Missing generated file: ${relativePath}`,
    );
    return false;
  }

  return true;
}

function readPublicText(relativePath) {
  if (!expectPublicFile(relativePath)) {
    return "";
  }

  return fs.readFileSync(
    publicPath(relativePath),
    "utf8",
  );
}

function readPublicJson(relativePath) {
  const content =
    readPublicText(relativePath);

  if (!content) {
    return null;
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    errors.push(
      `${relativePath}: invalid JSON (${error.message})`,
    );
    return null;
  }
}

function compareStringSets({
  actual,
  expected,
  label,
}) {
  const normalizedActual = [
    ...new Set(actual),
  ].sort();

  const normalizedExpected = [
    ...new Set(expected),
  ].sort();

  if (
    JSON.stringify(normalizedActual) !==
    JSON.stringify(normalizedExpected)
  ) {
    errors.push(
      `${label}: expected ` +
        `${normalizedExpected.join(", ")}, found ` +
        `${normalizedActual.join(", ")}`,
    );
  }
}

if (STATES.length !== 16) {
  errors.push(
    `Expected 16 Bundesländer, found ${STATES.length}`,
  );
}

if (YEARS.length !== 5) {
  errors.push(
    `Expected 5 supported years, found ${YEARS.length}`,
  );
}

if (combinations.length !== 80) {
  errors.push(
    `Expected 80 state-year combinations, ` +
      `found ${combinations.length}`,
  );
}

compareStringSets({
  actual: expectedCodes,
  expected: [
    "BB",
    "BE",
    "BW",
    "BY",
    "HB",
    "HE",
    "HH",
    "MV",
    "NI",
    "NW",
    "RP",
    "SH",
    "SL",
    "SN",
    "ST",
    "TH",
  ],
  label: "Bundesland configuration",
});

compareStringSets({
  actual: expectedYears.map(String),
  expected: [
    "2026",
    "2027",
    "2028",
    "2029",
    "2030",
  ],
  label: "Year configuration",
});

/*
 * Main application:
 * every configured state must have a PDF slug.
 */
const appSourcePath =
  path.join(appDir, "src", "App.jsx");

if (!fs.existsSync(appSourcePath)) {
  errors.push("Missing src/App.jsx");
} else {
  const appSource =
    fs.readFileSync(appSourcePath, "utf8");

  const normalizedAppSource =
    appSource.replace(/\\s+/g, " ");

  if (
    !appSource.includes(
      "STATE_DOWNLOAD_SLUGS",
    )
  ) {
    errors.push(
      "src/App.jsx: missing STATE_DOWNLOAD_SLUGS mapping",
    );
  }

  for (const [
    slug,
    ,
    ,
    code,
  ] of STATES) {
    const doubleQuotedEntry =
      `${code}: "${slug}"`;

    const singleQuotedEntry =
      `${code}: '${slug}'`;

    if (
      !normalizedAppSource.includes(
        doubleQuotedEntry,
      ) &&
      !normalizedAppSource.includes(
        singleQuotedEntry,
      )
    ) {
      errors.push(
        `src/App.jsx: missing download slug ` +
          `${code} → ${slug}`,
      );
    }
  }
}

/*
 * Every state-year combination must expose the same
 * SEO, annual-calendar, PDF, ICS and API artifacts.
 */
for (const {
  slug,
  name,
  code,
  year,
} of combinations) {
  const normalizedCode =
    code.toLowerCase();

  const seoFile =
    `schulferien-${slug}-${year}.html`;

  const annualHtml =
    `downloads/jahreskalender-${slug}-${year}.html`;

  const annualPdf =
    `downloads/schulferien-${slug}-${year}.pdf`;

  const annualIcs =
    `downloads/schulferien-${slug}-${year}.ics`;

  const expectedFiles = [
    seoFile,
    annualHtml,
    annualPdf,
    annualIcs,
    `api/v1/holidays/${code}/${year}.json`,
    `api/v1/public-holidays/${code}/${year}.json`,
    `api/v1/calendar/${code}/${year}.json`,
  ];

  for (const file of expectedFiles) {
    expectPublicFile(file);
  }

  const seoHtml =
    readPublicText(seoFile);

  if (!seoHtml) {
    continue;
  }

  const requiredSeoValues = [
    `Schulferien ${name} ${year}`,
    `/${annualHtml}`,
    `/${annualPdf}`,
    `/${annualIcs}`,
    `webcal://www.schulferienklar.de/calendar/${normalizedCode}.ics`,
    `?state=${code}&year=${year}`,
  ];

  for (const value of requiredSeoValues) {
    if (!seoHtml.includes(value)) {
      errors.push(
        `${seoFile}: missing regional feature ${value}`,
      );
    }
  }
}

/*
 * Jahreskalender manifest:
 * exactly 80 distinct state-year records.
 */
const annualManifest =
  readPublicJson(
    "downloads/jahreskalender-index.json",
  );

if (annualManifest) {
  const calendars =
    annualManifest.calendars || [];

  if (
    calendars.length !==
    combinations.length
  ) {
    errors.push(
      `Jahreskalender manifest: expected ` +
        `${combinations.length} records, ` +
        `found ${calendars.length}`,
    );
  }

  compareStringSets({
    actual: calendars.map(
      (calendar) =>
        `${calendar.stateCode}-${calendar.year}`,
    ),
    expected: combinations.map(
      ({ code, year }) =>
        `${code}-${year}`,
    ),
    label: "Jahreskalender manifest coverage",
  });
}

/*
 * Static API state coverage.
 */
const apiStates =
  readPublicJson("api/v1/states.json");

if (apiStates) {
  compareStringSets({
    actual: (apiStates.states || [])
      .map((state) => state.code),
    expected: expectedCodes,
    label: "Static API state coverage",
  });

  if (apiStates.stateCount !== 16) {
    errors.push(
      `Static API: expected stateCount 16, ` +
        `found ${apiStates.stateCount}`,
    );
  }
}

/*
 * Subscription feeds:
 * one automatically updated feed per state.
 */
const subscriptionManifest =
  readPublicJson("calendar/index.json");

if (subscriptionManifest) {
  const feeds =
    subscriptionManifest.feeds || [];

  compareStringSets({
    actual: feeds.map(
      (feed) => feed.bundeslandCode,
    ),
    expected: expectedCodes,
    label: "Subscription feed coverage",
  });

  for (const code of expectedCodes) {
    expectPublicFile(
      `calendar/${code.toLowerCase()}.ics`,
    );
  }
}

/*
 * Urlaubsplaner:
 * all 16 states must remain linked and the example
 * section must use several states instead of Bayern only.
 */
for (const year of YEARS) {
  const plannerFile =
    `urlaubsplaner-${year}.html`;

  const plannerHtml =
    readPublicText(plannerFile);

  if (!plannerHtml) {
    continue;
  }

  if (
    plannerHtml.includes(
      "Beispielrechnung Bayern",
    )
  ) {
    errors.push(
      `${plannerFile}: Bayern-only example remains`,
    );
  }

  if (
    !plannerHtml.includes(
      "Beispiele aus verschiedenen Bundesländern",
    )
  ) {
    errors.push(
      `${plannerFile}: missing multi-state example heading`,
    );
  }

  const exampleCodes = Array.from(
    plannerHtml.matchAll(
      /data-example-state="([A-Z]{2})"/g,
    ),
    (match) => match[1],
  );

  if (
    new Set(exampleCodes).size < 3
  ) {
    errors.push(
      `${plannerFile}: examples cover fewer than 3 states`,
    );
  }

  const plannerStateLinks =
    Array.from(
      plannerHtml.matchAll(
        new RegExp(
          `/\\?state=([A-Z]{2})&year=${year}` +
            `&vacationDays=4#brueckentage`,
          "g",
        ),
      ),
      (match) => match[1],
    );

  compareStringSets({
    actual: plannerStateLinks,
    expected: expectedCodes,
    label:
      `${plannerFile} planner state links`,
  });
}

/*
 * Widget:
 * the configurator must load the shared 16-state API
 * rather than maintain its own Bayern-only list.
 */
expectPublicFile("widget.html");
expectPublicFile("widget-demo.js");
expectPublicFile(
  "widgets/naechste-schulferien.html",
);

const widgetDemo =
  readPublicText("widget-demo.js");

if (
  widgetDemo &&
  !widgetDemo.includes(
    '"/api/v1/states.json"',
  )
) {
  errors.push(
    "widget-demo.js: widget does not load shared state API",
  );
}

if (
  widgetDemo &&
  !widgetDemo.includes(
    "statesDocument.states",
  )
) {
  errors.push(
    "widget-demo.js: widget does not use API state list",
  );
}

/*
 * Known Bayern-only implementation patterns that are
 * not allowed in shared generators or validators.
 * The Bayern 2027 Gold Page is intentionally excluded.
 */
const sharedFiles = [
  "scripts/generate-urlaubsplaner-page.mjs",
  "scripts/generate-subscription-calendars.mjs",
  "scripts/validate-subscription-calendars.mjs",
];

const forbiddenPatterns = [
  [
    "Beispielrechnung Bayern",
    "Bayern-only planner heading",
  ],
  [
    "DEFAULT_STATE_CODE",
    "single-state planner default",
  ],
  [
    "bayernPath",
    "Bayern-only validator",
  ],
  [
    "const YEARS = [2026",
    "duplicated year configuration",
  ],
];

for (const relativePath of sharedFiles) {
  const filePath =
    path.join(appDir, relativePath);

  const content =
    fs.readFileSync(filePath, "utf8");

  for (const [
    pattern,
    label,
  ] of forbiddenPatterns) {
    if (content.includes(pattern)) {
      errors.push(
        `${relativePath}: ${label}`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error(
    "\nRegional parity audit failed:",
  );

  for (const error of errors) {
    console.error(`- ${error}`);
  }

  process.exit(1);
}

console.log(
  "✅ Regional parity validated: " +
    "16 Bundesländer, 5 years, " +
    "80 SEO/download combinations, " +
    "240 calendar API files and 16 feeds.",
);
