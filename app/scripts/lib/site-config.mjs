export const YEARS = Object.freeze([
  2026,
  2027,
  2028,
  2029,
  2030,
]);

export const STATES = Object.freeze([
  [
    "baden-wuerttemberg",
    "Baden-Württemberg",
    "Baden-Wuerttemberg",
    "BW",
  ],
  [
    "bayern",
    "Bayern",
    "Bavaria",
    "BY",
  ],
  [
    "berlin",
    "Berlin",
    "Berlin",
    "BE",
  ],
  [
    "brandenburg",
    "Brandenburg",
    "Brandenburg",
    "BB",
  ],
  [
    "bremen",
    "Bremen",
    "Bremen",
    "HB",
  ],
  [
    "hamburg",
    "Hamburg",
    "Hamburg",
    "HH",
  ],
  [
    "hessen",
    "Hessen",
    "Hesse",
    "HE",
  ],
  [
    "mecklenburg-vorpommern",
    "Mecklenburg-Vorpommern",
    "Mecklenburg-Western Pomerania",
    "MV",
  ],
  [
    "niedersachsen",
    "Niedersachsen",
    "Lower Saxony",
    "NI",
  ],
  [
    "nordrhein-westfalen",
    "Nordrhein-Westfalen",
    "North Rhine-Westphalia",
    "NW",
  ],
  [
    "rheinland-pfalz",
    "Rheinland-Pfalz",
    "Rhineland-Palatinate",
    "RP",
  ],
  [
    "saarland",
    "Saarland",
    "Saarland",
    "SL",
  ],
  [
    "sachsen",
    "Sachsen",
    "Saxony",
    "SN",
  ],
  [
    "sachsen-anhalt",
    "Sachsen-Anhalt",
    "Saxony-Anhalt",
    "ST",
  ],
  [
    "schleswig-holstein",
    "Schleswig-Holstein",
    "Schleswig-Holstein",
    "SH",
  ],
  [
    "thueringen",
    "Thüringen",
    "Thuringia",
    "TH",
  ],
]);

export const STATE_BY_CODE = new Map(
  STATES.map(
    ([
      slug,
      name,
      englishName,
      code,
    ]) => {
      return [
        code,
        {
          slug,
          name,
          englishName,
          code,
        },
      ];
    },
  ),
);

export function getStateByCode(code) {
  return (
    STATE_BY_CODE.get(
      String(code || "").toUpperCase(),
    ) || null
  );
}

export function getStateYearCombinations() {
  return STATES.flatMap(
    ([
      slug,
      name,
      englishName,
      code,
    ]) => {
      return YEARS.map((year) => {
        return {
          slug,
          name,
          englishName,
          code,
          year,
        };
      });
    },
  );
}
