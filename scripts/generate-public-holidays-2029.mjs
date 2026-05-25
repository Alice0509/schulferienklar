import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const outputDir = path.join(rootDir, "data", "public-holidays");
const appOutputDir = path.join(rootDir, "app", "public", "data", "public-holidays");

fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(appOutputDir, { recursive: true });

const createdAt = "2026-05-25";
const year = 2029;

const states = [
  ["BW", "Baden-Württemberg", "baden_wuerttemberg"],
  ["BY", "Bayern", "bayern"],
  ["BE", "Berlin", "berlin"],
  ["BB", "Brandenburg", "brandenburg"],
  ["HB", "Bremen", "bremen"],
  ["HH", "Hamburg", "hamburg"],
  ["HE", "Hessen", "hessen"],
  ["MV", "Mecklenburg-Vorpommern", "mecklenburg_vorpommern"],
  ["NI", "Niedersachsen", "niedersachsen"],
  ["NW", "Nordrhein-Westfalen", "nordrhein_westfalen"],
  ["RP", "Rheinland-Pfalz", "rheinland_pfalz"],
  ["SL", "Saarland", "saarland"],
  ["SN", "Sachsen", "sachsen"],
  ["ST", "Sachsen-Anhalt", "sachsen_anhalt"],
  ["SH", "Schleswig-Holstein", "schleswig_holstein"],
  ["TH", "Thüringen", "thueringen"],
];

const baseHolidays = [
  ["new-year", "Neujahr", "New Year's Day", "2029-01-01"],
  ["good-friday", "Karfreitag", "Good Friday", "2029-03-30"],
  ["easter-monday", "Ostermontag", "Easter Monday", "2029-04-02"],
  ["labour-day", "Tag der Arbeit", "Labour Day", "2029-05-01"],
  ["ascension", "Christi Himmelfahrt", "Ascension Day", "2029-05-10"],
  ["pentecost-monday", "Pfingstmontag", "Whit Monday", "2029-05-21"],
  ["german-unity", "Tag der Deutschen Einheit", "German Unity Day", "2029-10-03"],
  ["christmas-day", "1. Weihnachtsfeiertag", "Christmas Day", "2029-12-25"],
  ["second-christmas-day", "2. Weihnachtsfeiertag", "Second Day of Christmas", "2029-12-26"],
];

const regionalRules = [
  {
    slug: "epiphany",
    nameDe: "Heilige Drei Könige",
    nameEn: "Epiphany",
    date: "2029-01-06",
    states: ["BW", "BY", "ST"],
    scope: "statewide",
    includeInDefaultCalendar: true,
  },
  {
    slug: "international-womens-day",
    nameDe: "Internationaler Frauentag",
    nameEn: "International Women's Day",
    date: "2029-03-08",
    states: ["BE", "MV"],
    scope: "statewide",
    includeInDefaultCalendar: true,
  },
  {
    slug: "easter-sunday",
    nameDe: "Ostersonntag",
    nameEn: "Easter Sunday",
    date: "2029-04-01",
    states: ["BB"],
    scope: "statewide",
    includeInDefaultCalendar: true,
  },
  {
    slug: "whit-sunday",
    nameDe: "Pfingstsonntag",
    nameEn: "Whit Sunday",
    date: "2029-05-20",
    states: ["BB"],
    scope: "statewide",
    includeInDefaultCalendar: true,
  },
  {
    slug: "corpus-christi",
    nameDe: "Fronleichnam",
    nameEn: "Corpus Christi",
    date: "2029-05-31",
    states: ["BW", "BY", "HE", "NW", "RP", "SL"],
    scope: "statewide",
    includeInDefaultCalendar: true,
  },
  {
    slug: "corpus-christi",
    nameDe: "Fronleichnam",
    nameEn: "Corpus Christi",
    date: "2029-05-31",
    states: ["SN", "TH"],
    scope: "regional",
    includeInDefaultCalendar: false,
    notes: "Regional public holiday only in selected Catholic municipalities/areas.",
  },
  {
    slug: "peace-festival-augsburg",
    nameDe: "Augsburger Friedensfest",
    nameEn: "Augsburg Peace Festival",
    date: "2029-08-08",
    states: ["BY"],
    scope: "local",
    includeInDefaultCalendar: false,
    notes: "Local public holiday in Augsburg only.",
  },
  {
    slug: "assumption",
    nameDe: "Mariä Himmelfahrt",
    nameEn: "Assumption Day",
    date: "2029-08-15",
    states: ["SL"],
    scope: "statewide",
    includeInDefaultCalendar: true,
  },
  {
    slug: "assumption",
    nameDe: "Mariä Himmelfahrt",
    nameEn: "Assumption Day",
    date: "2029-08-15",
    states: ["BY"],
    scope: "regional",
    includeInDefaultCalendar: false,
    notes: "Public holiday only in Bavarian municipalities with predominantly Catholic population.",
  },
  {
    slug: "world-childrens-day",
    nameDe: "Weltkindertag",
    nameEn: "World Children's Day",
    date: "2029-09-20",
    states: ["TH"],
    scope: "statewide",
    includeInDefaultCalendar: true,
  },
  {
    slug: "reformation-day",
    nameDe: "Reformationstag",
    nameEn: "Reformation Day",
    date: "2029-10-31",
    states: ["BB", "HB", "HH", "MV", "NI", "SN", "ST", "SH", "TH"],
    scope: "statewide",
    includeInDefaultCalendar: true,
  },
  {
    slug: "all-saints",
    nameDe: "Allerheiligen",
    nameEn: "All Saints' Day",
    date: "2029-11-01",
    states: ["BW", "BY", "NW", "RP", "SL"],
    scope: "statewide",
    includeInDefaultCalendar: true,
  },
  {
    slug: "repentance-day",
    nameDe: "Buß- und Bettag",
    nameEn: "Repentance and Prayer Day",
    date: "2029-11-21",
    states: ["SN"],
    scope: "statewide",
    includeInDefaultCalendar: true,
  },
];

function makeHoliday(code, slug, nameDe, nameEn, date, options = {}) {
  return {
    id: `${code.toLowerCase()}-public-2029-${slug}`,
    name: { de: nameDe, en: nameEn },
    date,
    type: "public_holiday",
    scope: options.scope || "statewide",
    includeInDefaultCalendar: options.includeInDefaultCalendar ?? true,
    ...(options.notes ? { notes: options.notes } : {}),
  };
}

for (const [code, name, fileStem] of states) {
  const holidays = [];

  for (const [slug, nameDe, nameEn, date] of baseHolidays) {
    holidays.push(makeHoliday(code, slug, nameDe, nameEn, date));
  }

  for (const rule of regionalRules) {
    if (!rule.states.includes(code)) continue;

    holidays.push(
      makeHoliday(code, rule.slug, rule.nameDe, rule.nameEn, rule.date, {
        scope: rule.scope,
        includeInDefaultCalendar: rule.includeInDefaultCalendar,
        notes: rule.notes,
      })
    );
  }

  holidays.sort((a, b) => a.date.localeCompare(b.date));

  const dataset = {
    datasetName: `schulferienklar_public_holidays_${fileStem}_2029`,
    version: "0.1",
    createdAt,
    bundeslandCode: code,
    bundeslandName: name,
    year,
    dataPolicy:
      "Statutory public holidays for the Bundesland. Regional/local exceptions are marked and excluded from default calendar unless state-wide.",
    sources: [
      {
        sourceName: "Consolidated German public holiday overview by Bundesland",
        sourceUrl: "https://www.feiertage-deutschland.de/2029/",
        secondarySourceUrl: "https://ferien-deutschland.com/feiertage-2029/",
        trustLevel: "reference",
        lastCheckedAt: createdAt,
        notes:
          "Dates generated from nationwide German public holidays and Bundesland-specific statutory holiday mappings for 2029. Regional/local exceptions are marked separately.",
      },
    ],
    holidays,
  };

  const fileName = `${fileStem}_2029.json`;
  const target = path.join(outputDir, fileName);
  const appTarget = path.join(appOutputDir, fileName);

  fs.writeFileSync(target, JSON.stringify(dataset, null, 2) + "\n", "utf8");
  fs.copyFileSync(target, appTarget);

  console.log(`Generated ${path.relative(rootDir, target)} (${holidays.length} events)`);
}
