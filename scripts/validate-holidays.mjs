import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const holidaysDir = path.join(rootDir, "data", "holidays");

const expectedBundeslandCodes = new Set([
  "BW", "BY", "BE", "BB", "HB", "HH", "HE", "MV",
  "NI", "NW", "RP", "SL", "SN", "ST", "SH", "TH"
]);

const requiredEventFields = [
  "id",
  "bundeslandCode",
  "bundeslandName",
  "schoolYear",
  "category",
  "type",
  "name",
  "startDate",
  "endDate",
  "dateSemantics",
  "sourceName",
  "sourceUrl",
  "lastCheckedAt",
  "status",
  "includeInDefaultCalendar"
];

const allowedCategories = new Set([
  "school_holiday",
  "state_school_free_day"
]);

const allowedStatuses = new Set([
  "verified",
  "partial",
  "draft",
  "needs_review"
]);

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

let errorCount = 0;
let warningCount = 0;
const seenEventIds = new Set();
const seenBundeslandCodes = new Set();

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

function validateHolidayEvent(event, fileName, index) {
  const label = `${fileName} holidays[${index}]`;

  for (const field of requiredEventFields) {
    if (!(field in event)) {
      error(`${label}: missing required field "${field}"`);
    }
  }

  if (typeof event.id === "string") {
    if (seenEventIds.has(event.id)) {
      error(`${label}: duplicate event id "${event.id}"`);
    }
    seenEventIds.add(event.id);
  } else {
    error(`${label}: id must be a string`);
  }

  if (!expectedBundeslandCodes.has(event.bundeslandCode)) {
    error(`${label}: invalid bundeslandCode "${event.bundeslandCode}"`);
  } else {
    seenBundeslandCodes.add(event.bundeslandCode);
  }

  if (!allowedCategories.has(event.category)) {
    error(`${label}: invalid category "${event.category}"`);
  }

  if (!allowedStatuses.has(event.status)) {
    error(`${label}: invalid status "${event.status}"`);
  }

  if (!event.name || typeof event.name !== "object") {
    error(`${label}: name must be an object`);
  } else {
    if (!event.name.de) error(`${label}: name.de is required`);
    if (!event.name.en) warning(`${label}: name.en is missing`);
  }

  if (!isValidDateString(event.startDate)) {
    error(`${label}: invalid startDate "${event.startDate}"`);
  }

  if (!isValidDateString(event.endDate)) {
    error(`${label}: invalid endDate "${event.endDate}"`);
  }

  if (isValidDateString(event.startDate) && isValidDateString(event.endDate)) {
    if (event.startDate > event.endDate) {
      error(`${label}: startDate is after endDate`);
    }
  }

  if (event.dateSemantics !== "inclusive_end_date") {
    error(`${label}: dateSemantics should be "inclusive_end_date"`);
  }

  if (typeof event.sourceUrl !== "string" || !event.sourceUrl.startsWith("http")) {
    error(`${label}: sourceUrl must be a URL`);
  }

  if (!isValidDateString(event.lastCheckedAt)) {
    error(`${label}: invalid lastCheckedAt "${event.lastCheckedAt}"`);
  }

  if (typeof event.includeInDefaultCalendar !== "boolean") {
    error(`${label}: includeInDefaultCalendar must be boolean`);
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
    validateHolidayEvent(event, fileName, index);
  });
}

if (!fs.existsSync(holidaysDir)) {
  error(`Missing holidays directory: ${holidaysDir}`);
  process.exit(1);
}

const jsonFiles = fs
  .readdirSync(holidaysDir)
  .filter((file) => file.endsWith(".json"))
  .sort();

console.log(`Checking ${jsonFiles.length} JSON files in data/holidays...\n`);

if (jsonFiles.length !== 16) {
  error(`Expected 16 JSON files, found ${jsonFiles.length}`);
}

for (const file of jsonFiles) {
  validateDataset(path.join(holidaysDir, file));
}

for (const code of expectedBundeslandCodes) {
  if (!seenBundeslandCodes.has(code)) {
    error(`Missing Bundesland code in holiday events: ${code}`);
  }
}

console.log("\nValidation summary:");
console.log(`JSON files checked: ${jsonFiles.length}`);
console.log(`Unique event ids: ${seenEventIds.size}`);
console.log(`Bundesland codes found: ${Array.from(seenBundeslandCodes).sort().join(", ")}`);
console.log(`Warnings: ${warningCount}`);
console.log(`Errors: ${errorCount}`);

if (errorCount > 0) {
  process.exit(1);
}

console.log("\n✅ Holiday data validation passed.");
