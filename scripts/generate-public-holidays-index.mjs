import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const publicHolidaysDir = path.join(rootDir, "data", "public-holidays");
const outputPath = path.join(publicHolidaysDir, "index.json");

if (!fs.existsSync(publicHolidaysDir)) {
  throw new Error("data/public-holidays directory does not exist.");
}

const jsonFiles = fs
  .readdirSync(publicHolidaysDir)
  .filter((file) => file.endsWith(".json"))
  .filter((file) => file !== "index.json")
  .sort();

const datasets = jsonFiles.map((jsonFile) => {
  const filePath = path.join(publicHolidaysDir, jsonFile);
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

  return {
    bundeslandCode: data.bundeslandCode,
    bundeslandName: data.bundeslandName,
    year: data.year,
    version: data.version,
    jsonFile,
    eventCount: data.holidays?.length || 0,
    defaultCalendarEventCount:
      data.holidays?.filter((holiday) => holiday.includeInDefaultCalendar).length || 0,
    scopes: Array.from(new Set((data.holidays || []).map((holiday) => holiday.scope))).sort(),
  };
});

datasets.sort((a, b) => {
  const byState = a.bundeslandName.localeCompare(b.bundeslandName, "de");
  if (byState !== 0) return byState;
  return a.year - b.year;
});

const index = {
  generatedAt: new Date().toISOString().slice(0, 10),
  totalDatasets: datasets.length,
  totalEvents: datasets.reduce((sum, dataset) => sum + dataset.eventCount, 0),
  datasets,
};

fs.writeFileSync(outputPath, JSON.stringify(index, null, 2) + "\n", "utf8");

console.log(`Generated ${path.relative(rootDir, outputPath)}`);
console.log(`Datasets: ${index.totalDatasets}`);
console.log(`Events: ${index.totalEvents}`);
