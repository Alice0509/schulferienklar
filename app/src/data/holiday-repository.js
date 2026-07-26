const DEFAULT_BASE_URL =
  typeof import.meta.env?.BASE_URL === "string"
    ? import.meta.env.BASE_URL
    : "/";

function buildDataUrl(baseUrl, path) {
  const normalizedBaseUrl = String(baseUrl || "/");
  const baseWithSlash = normalizedBaseUrl.endsWith("/")
    ? normalizedBaseUrl
    : `${normalizedBaseUrl}/`;

  return `${baseWithSlash}${String(path).replace(/^\/+/, "")}`;
}

export function createHolidayRepository({
  baseUrl = DEFAULT_BASE_URL,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new Error("A fetch implementation is required.");
  }

  const requestCache = new Map();

  function loadJson(path, errorMessage) {
    const url = buildDataUrl(baseUrl, path);

    if (!requestCache.has(url)) {
      const request = (async () => {
        const response = await fetchImpl(url);

        if (!response.ok) {
          throw new Error(errorMessage || `${path} konnte nicht geladen werden.`);
        }

        return response.json();
      })().catch((error) => {
        requestCache.delete(url);
        throw error;
      });

      requestCache.set(url, request);
    }

    return requestCache.get(url);
  }

  function loadSchoolHolidayIndex() {
    return loadJson(
      "/data/holidays/index.json",
      "Index konnte nicht geladen werden.",
    );
  }

  function loadPublicHolidayIndex() {
    return loadJson(
      "/data/public-holidays/index.json",
      "Feiertagsindex konnte nicht geladen werden.",
    );
  }

  function loadSchoolHolidayDatasetByMeta(meta) {
    if (!meta?.jsonFile) {
      return Promise.resolve(null);
    }

    return loadJson(
      `/data/holidays/${meta.jsonFile}`,
      `${meta.jsonFile} konnte nicht geladen werden.`,
    );
  }

  function loadPublicHolidayDatasetByMeta(meta) {
    if (!meta?.jsonFile) {
      return Promise.resolve(null);
    }

    return loadJson(
      `/data/public-holidays/${meta.jsonFile}`,
      `${meta.jsonFile} konnte nicht geladen werden.`,
    );
  }

  function clearCache() {
    requestCache.clear();
  }

  return {
    loadSchoolHolidayIndex,
    loadPublicHolidayIndex,
    loadSchoolHolidayDatasetByMeta,
    loadPublicHolidayDatasetByMeta,
    clearCache,
  };
}

export const holidayRepository = createHolidayRepository();
