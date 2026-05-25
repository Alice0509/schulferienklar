import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const publicHolidaysDir = path.join(rootDir, "data", "public-holidays");

const expectedBundeslandCodes = new Set([
  "BW", "BY", "BE", "BB", "HB", "HH", "HE", "MV",
  "NI", "NW", "RP", "SL", "SN", "ST", "SH", "TH"
]);

const allowedTypes = new Set(["public_holiday"]);

const allowedScopes = new Set([
  "statewide",
  "regional",
  "local"
]);

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

let errorCount = 0;
let warningCount = 0;
const seenIds = new Set();

function error(message) {
  errorCount += 1;
  console.error(`❌ ${message}`);
}

function warning(message) {
  warningCount += 1;
  console.warn(`⚠️  ${message}`);
}

function isValidDateString(value) {
  if (typeof value !== "string" || !datePattern.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && value === date.toISOString().slice(0, 10);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    error(`${filePath}: JSON could not be parsed: ${err.message}`);
    return null;
  }
}

function validatePublicHolidayEvent(event, fileName, index, datasetYear) {
  const label = `${fileName} holidays[${index}]`;

  const requiredFields = [
    "id",
    "name",
    "date",
    "type",
    "scope",
    "includeInDefaultCalendar"
  ];

  for (const field of requiredFields) {
    if (!(field in event)) {
      error(`${label}: missing required field "${field}"`);
    }
  }

  if (typeof event.id !== "string") {
    error(`${label}: id must be a string`);
  } else if (seenIds.has(event.id)) {
    error(`${label}: duplicate id "${event.id}"`);
  } else {
    seenIds.add(event.id);
  }

  if (!event.name || typeof event.name !== "object") {
    error(`${label}: name must be an object`);
  } else {
    if (!event.name.de) error(`${label}: name.de is required`);
    if (!event.name.en) warning(`${label}: name.en is missing`);
  }

  if (!isValidDateString(event.date)) {
    error(`${label}: invalid date "${event.date}"`);
  } else if (!event.date.startsWith(String(datasetYear))) {
    error(`${label}: date "${event.date}" does not match dataset year ${datasetYear}`);
  }

  if (!allowedTypes.has(event.type)) {
    error(`${label}: invalid type "${event.type}"`);
  }

  if (!allowedScopes.has(event.scope)) {
    error(`${label}: invalid scope "${event.scope}"`);
  }

  if (typeof event.includeInDefaultCalendar !== "boolean") {
    error(`${label}: includeInDefaultCalendar must be boolean`);
  }

  if (event.scope !== "statewide" && event.includeInDefaultCalendar === true) {
    warning(`${label}: non-statewide holiday is included in default calendar`);
  }
}

function validateDataset(filePath) {
  const fileName = path.basename(filePath);
  const data = readJson(filePath);

  if (!data) return;

  if (!data.datasetName) {
    error(`${fileName}: missing datasetName`);
  }

  if (!data.version) {
    error(`${fileName}: missing version`);
  }

  if (!isValidDateString(data.createdAt)) {
    error(`${fileName}: invalid createdAt "${data.createdAt}"`);
  }

  if (!expectedBundeslandCodes.has(data.bundeslandCode)) {
    error(`${fileName}: invalid bundeslandCode "${data.bundeslandCode}"`);
  }

  if (!data.bundeslandName) {
    error(`${fileName}: missing bundeslandName`);
  }

  if (!Number.isInteger(data.year)) {
    error(`${fileName}: year must be an integer`);
  }

  if (!Array.isArray(data.sources) || data.sources.length === 0) {
    error(`${fileName}: sources must be a non-empty array`);
  }

  if (!Array.isArray(data.holidays)) {
    error(`${fileName}: holidays must be an array`);
    return;
  }

  if (data.holidays.length === 0) {
    error(`${fileName}: holidays array is empty`);
  }

  data.holidays.forEach((event, index) => {
    validatePublicHolidayEvent(event, fileName, index, data.year);
  });
}

if (!fs.existsSync(publicHolidaysDir)) {
  console.log("No data/public-holidays directory found. Skipping public holiday validation.");
  process.exit(0);
}

const jsonFiles = fs
  .readdirSync(publicHolidaysDir)
  .filter((file) => file.endsWith(".json"))
  .sort();

console.log(`Checking ${jsonFiles.length} public holiday JSON files in data/public-holidays...\n`);

if (jsonFiles.length === 0) {
  warning("No public holiday JSON files found.");
}

for (const file of jsonFiles) {
  validateDataset(path.join(publicHolidaysDir, file));
}

console.log("\nPublic holiday validation summary:");
console.log(`JSON files checked: ${jsonFiles.length}`);
console.log(`Unique public holiday ids: ${seenIds.size}`);
console.log(`Warnings: ${warningCount}`);
console.log(`Errors: ${errorCount}`);

if (errorCount > 0) {
  process.exit(1);
}

console.log("\n✅ Public holiday validation passed.");
