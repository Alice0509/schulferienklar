import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const holidaysDir = path.join(rootDir, "data", "holidays");
const outputPath = path.join(holidaysDir, "index.json");

const jsonFiles = fs
  .readdirSync(holidaysDir)
  .filter((file) => file.endsWith(".json"))
  .filter((file) => file !== "index.json")
  .sort();

const datasets = jsonFiles.map((jsonFile) => {
  const filePath = path.join(holidaysDir, jsonFile);
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

  const firstHoliday = data.holidays?.[0];

  if (!firstHoliday) {
    throw new Error(`${jsonFile}: holidays array is empty or missing`);
  }

  const bundeslandCode = firstHoliday.bundeslandCode;
  const bundeslandName = firstHoliday.bundeslandName;
  const version = data.version ?? "unknown";
  const csvFile = jsonFile.replace(/\.json$/, ".csv");

  const csvPath = path.join(holidaysDir, csvFile);
  if (!fs.existsSync(csvPath)) {
    throw new Error(`${jsonFile}: matching CSV file not found: ${csvFile}`);
  }

  const schoolYears = Array.from(
    new Set(data.holidays.map((holiday) => holiday.schoolYear))
  ).sort();

  const statuses = Array.from(
    new Set(data.holidays.map((holiday) => holiday.status))
  ).sort();

  const dateRange = data.holidays.reduce(
    (range, holiday) => {
      if (!range.startDate || holiday.startDate < range.startDate) {
        range.startDate = holiday.startDate;
      }
      if (!range.endDate || holiday.endDate > range.endDate) {
        range.endDate = holiday.endDate;
      }
      return range;
    },
    { startDate: null, endDate: null }
  );

  return {
    bundeslandCode,
    bundeslandName,
    version,
    jsonFile,
    csvFile,
    eventCount: data.holidays.length,
    schoolYears,
    dateRange,
    statuses
  };
});

datasets.sort((a, b) => a.bundeslandName.localeCompare(b.bundeslandName, "de"));

const index = {
  generatedAt: new Date().toISOString().slice(0, 10),
  totalBundeslaender: datasets.length,
  totalEvents: datasets.reduce((sum, dataset) => sum + dataset.eventCount, 0),
  datasets
};

fs.writeFileSync(outputPath, JSON.stringify(index, null, 2) + "\n", "utf8");

console.log(`Generated ${path.relative(rootDir, outputPath)}`);
console.log(`Bundeslaender: ${index.totalBundeslaender}`);
console.log(`Events: ${index.totalEvents}`);
