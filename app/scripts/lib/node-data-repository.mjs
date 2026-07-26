import fs from "node:fs";
import path from "node:path";

export function createNodeHolidayRepository({
  publicDir = path.resolve("public"),
  readFileImpl = fs.readFileSync,
} = {}) {
  if (typeof readFileImpl !== "function") {
    throw new Error("A file-reading implementation is required.");
  }

  const schoolHolidayDir = path.join(
    publicDir,
    "data",
    "holidays",
  );

  const publicHolidayDir = path.join(
    publicDir,
    "data",
    "public-holidays",
  );

  const jsonCache = new Map();

  function readJson(filePath) {
    const normalizedPath = path.resolve(filePath);

    if (!jsonCache.has(normalizedPath)) {
      const content = readFileImpl(normalizedPath, "utf8");
      const data = JSON.parse(content);

      jsonCache.set(normalizedPath, data);
    }

    return jsonCache.get(normalizedPath);
  }

  function loadSchoolHolidayIndex() {
    return readJson(
      path.join(schoolHolidayDir, "index.json"),
    );
  }

  function loadPublicHolidayIndex() {
    return readJson(
      path.join(publicHolidayDir, "index.json"),
    );
  }

  function findSchoolHolidayDatasetMeta(code) {
    const index = loadSchoolHolidayIndex();

    return (
      index.datasets?.find((item) => {
        return item.bundeslandCode === code;
      }) || null
    );
  }

  function findPublicHolidayDatasetMeta(code, year) {
    const index = loadPublicHolidayIndex();
    const numericYear = Number(year);

    return (
      index.datasets?.find((item) => {
        return (
          item.bundeslandCode === code &&
          Number(item.year) === numericYear
        );
      }) || null
    );
  }

  function loadSchoolHolidayDatasetByMeta(meta) {
    if (!meta?.jsonFile) {
      return null;
    }

    return readJson(
      path.join(schoolHolidayDir, meta.jsonFile),
    );
  }

  function loadPublicHolidayDatasetByMeta(meta) {
    if (!meta?.jsonFile) {
      return null;
    }

    return readJson(
      path.join(publicHolidayDir, meta.jsonFile),
    );
  }

  function loadSchoolHolidayDataset(code) {
    const meta = findSchoolHolidayDatasetMeta(code);

    return loadSchoolHolidayDatasetByMeta(meta);
  }

  function loadPublicHolidayDataset(code, year) {
    const meta = findPublicHolidayDatasetMeta(code, year);

    return loadPublicHolidayDatasetByMeta(meta);
  }

  function clearCache() {
    jsonCache.clear();
  }

  return {
    loadSchoolHolidayIndex,
    loadPublicHolidayIndex,
    findSchoolHolidayDatasetMeta,
    findPublicHolidayDatasetMeta,
    loadSchoolHolidayDatasetByMeta,
    loadPublicHolidayDatasetByMeta,
    loadSchoolHolidayDataset,
    loadPublicHolidayDataset,
    clearCache,
  };
}

export const nodeHolidayRepository =
  createNodeHolidayRepository();
