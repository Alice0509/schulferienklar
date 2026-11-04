import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  couldHaveKlareeHoliday, getKlareeSeasonalMoment, getKlareeGreetingControls,
  getKlareeEasterWindow, isKlareeEasterEventDate,
} from "../src/klaree-seasonal.js";

const publicDataRoot = path.join(process.cwd(), "public", "data", "public-holidays");
const index = JSON.parse(fs.readFileSync(path.join(publicDataRoot, "index.json"), "utf8"));
const holidayData = (code, year) => {
  const meta = index.datasets.find((item) => item.bundeslandCode === code && item.year === year);
  assert.ok(meta, `Missing public holiday dataset for ${code}, ${year}`);
  return JSON.parse(fs.readFileSync(path.join(publicDataRoot, meta.jsonFile), "utf8"));
};
const localDate = (year, month, day) => new Date(year, month - 1, day, 12, 0, 0);
const season = (year, month, day, code = "BY", locale = "de", preview = null) =>
  getKlareeSeasonalMoment({
    date: localDate(year, month, day),
    stateCode: code, holidayDataset: holidayData(code, year),
    locale, preview,
  });

test("Outside seasonal windows, Klaree keeps her ordinary daily cameo", () => {
  assert.equal(season(2026, 11, 16), null);
  assert.equal(season(2026, 11, 30), null);
  assert.equal(season(2027, 1, 7), null);
  assert.equal(season(2027, 3, 13), null);
  assert.equal(season(2027, 4, 5), null);
  assert.equal(season(2026, 3, 21), null);
  assert.equal(season(2026, 4, 13), null);
});

test("Christmas greeting lasts from December 1 through January 6, across the year boundary", () => {
  for (const day of [1, 6, 23, 24, 25, 26, 27, 31]) {
    const moment = season(2026, 12, day);
    assert.equal(moment?.kind, "christmas", `December ${day}`);
    assert.equal(moment.image, "/klaree-christmas-2026.webp");
    assert.equal(moment.statutory, false, "Christmas artwork cannot claim every day is a public holiday");
    assert.match(moment.title, /Weihnachten/);
    assert.equal(moment.id, "christmas-2026");
  }
  for (const day of [2, 5, 6]) {
    const moment = season(2027, 1, day, "BE");
    assert.equal(moment?.kind, "christmas", `January ${day}`);
    assert.equal(moment?.id, "christmas-2026", "One Christmas season keeps a stable ID");
  }
  assert.equal(season(2027, 1, 7, "BE"), null);
  assert.equal(season(2027, 1, 1, "BE")?.kind, "holiday",
    "Verified New Year's Day should take priority over the seasonal artwork");
  assert.equal(season(2027, 1, 6, "BY")?.title, "Heilige Drei Könige",
    "Statewide Epiphany should take priority in Bavaria");
  const withoutData = getKlareeSeasonalMoment({ date: localDate(2026, 12, 1), stateCode: "BY" });
  assert.equal(withoutData.kind, "christmas");
  assert.equal(withoutData.statutory, false);
});

test("Easter greeting runs 14 days before through 7 days after Easter, independent of year selection", () => {
  for (const day of [14, 15, 23, 24, 25, 26, 27, 28, 29, 30, 31]) {
    assert.equal(season(2027, 3, day)?.kind, "easter", `2027-03-${day}`);
  }
  for (const day of [1, 2, 3, 4]) {
    assert.equal(season(2027, 4, day)?.kind, "easter", `2027-04-${day}`);
  }
  assert.equal(season(2027, 3, 13), null);
  assert.equal(season(2027, 4, 5), null);
  for (const day of [22, 23, 31]) {
    assert.equal(season(2026, 3, day)?.kind, "easter", `2026-03-${day}`);
  }
  for (const day of [1, 2, 3, 4, 5, 6, 12]) {
    assert.equal(season(2026, 4, day)?.kind, "easter", `2026-04-${day}`);
  }
  assert.equal(season(2026, 3, 21), null);
  assert.equal(season(2026, 4, 13), null);
  const withStaleData = getKlareeSeasonalMoment({
    date: localDate(2027, 3, 28), stateCode: "BY", holidayDataset: holidayData("BY", 2026),
  });
  assert.equal(withStaleData?.kind, "easter", "Editorial season uses actual date, not the holiday-data publication year");
  assert.equal(withStaleData?.statutory, false, "Without verified data there are no statutory claims");
  const withoutData = getKlareeSeasonalMoment({
    date: localDate(2027, 3, 28), stateCode: "BY",
  });
  assert.equal(withoutData?.kind, "easter", "Annual Easter artwork must continue beyond the published datasets");
  assert.equal(withoutData?.statutory, false);
});

test("State-specific holidays appear only where verified statewide, never on regional/local exceptions", () => {
  const inBerlin = season(2026, 3, 8, "BE");
  const inBavaria = season(2026, 3, 8, "BY");
  assert.equal(inBerlin?.title, "Internationaler Frauentag");
  assert.equal(inBerlin?.statutory, true);
  assert.equal(inBavaria, null);
  assert.equal(season(2026, 1, 6, "BY")?.title, "Heilige Drei Könige");
  assert.equal(season(2026, 1, 6, "BE")?.kind, "christmas",
    "Berlin must not claim Epiphany is a public holiday, but the winter season still appears");
  assert.equal(season(2026, 10, 31, "SN")?.title, "Reformationstag");
  assert.equal(season(2026, 10, 31, "BY")?.kind, "autumn");
  assert.equal(season(2026, 8, 15, "BY")?.kind, "summer",
    "Regional Mariä Himmelfahrt cannot replace a generic summer greeting");
  assert.equal(season(2026, 8, 15, "BY")?.statutory, false);
  assert.equal(season(2026, 8, 8, "BY")?.kind, "summer",
    "Augsburg-only holiday cannot replace a Bavaria-wide summer greeting");
  assert.equal(season(2026, 8, 8, "BY")?.statutory, false);
});

test("National unity holiday works across all 16 states with correct localization", () => {
  const states = index.datasets.filter(({ year }) => year === 2026);
  assert.equal(states.length, 16);
  for (const { bundeslandCode } of states) {
    const de = season(2026, 10, 3, bundeslandCode);
    const en = season(2026, 10, 3, bundeslandCode, "en");
    assert.equal(de?.title, "Tag der Deutschen Einheit", bundeslandCode);
    assert.equal(de?.statutory, true);
    assert.equal(en?.title, "German Unity Day");
    assert.notEqual(de.message, en.message);
  }
});

test("Summer and autumn last for seasonal windows without claiming school holidays", () => {
  assert.equal(season(2026, 6, 20), null);
  for (const [month, day] of [[6,21],[7,1],[8,31]]) {
    for (const state of ["BY", "BE", "SN"]) {
      const moment = season(2026, month, day, state);
      assert.equal(moment?.kind, "summer", `${state} ${month}/${day}`);
      assert.equal(moment?.statutory, false);
      assert.equal(moment?.image, "/klaree-walk.webp");
      assert.match(moment?.title, /Sommer/);
      assert.ok(moment?.teaser);
    }
  }
  assert.equal(season(2026, 9, 1), null);
  assert.equal(season(2026, 9, 21), null);
  for (const [month, day] of [[9,22],[10,15],[11,3],[11,15]]) {
    const moment = season(2026, month, day);
    assert.equal(moment?.kind, "autumn", `${month}/${day}`);
    assert.equal(moment?.statutory, false);
    assert.equal(moment?.image, "/klaree-rest.webp");
  }
  assert.equal(season(2026, 11, 16), null);
  assert.equal(season(2026, 11, 1, "BY")?.title, "Allerheiligen",
    "Verified statewide holiday supersedes the autumn scene in Bavaria");
  assert.equal(season(2026, 11, 1, "BE")?.kind, "autumn",
    "Berlin must not claim Bavaria's holiday as its own");
});

test("Preview parameters are bilingual, do not alter calendars and are explicitly non-current", () => {
  for (const language of ["de", "en"]) {
    for (const preview of ["christmas", "easter", "summer", "autumn"]) {
      const demo = season(2026, 11, 16, "BY", language, preview);
      assert.equal(demo.kind, preview);
      assert.equal(demo.isPreview, true);
      assert.ok(demo.previewLabel);
      assert.equal(demo.statutory, false);
      assert.ok(demo.message && demo.teaser && demo.alt && demo.image);
      if (language === "de") assert.match(demo.previewLabel, /Vorschau/);
      if (language === "en") assert.match(demo.previewLabel, /Preview/);
    }
  }
  assert.equal(season(2026, 11, 16, "BY", "de", "unknown"), null);
  assert.notEqual(season(2026, 7, 1, "BY", "de")?.message, season(2026, 7, 1, "BY", "en")?.message);
  assert.equal(getKlareeGreetingControls("de").open, "Gruß ansehen");
  assert.equal(getKlareeGreetingControls("en").open, "View greeting");
});

test("Only potential holiday months load additional calendar data", () => {
  assert.equal(couldHaveKlareeHoliday(localDate(2026, 7, 3)), false);
  assert.equal(couldHaveKlareeHoliday(localDate(2026, 3, 8)), true);
  assert.equal(couldHaveKlareeHoliday(localDate(2026, 12, 24)), true);
  assert.equal(couldHaveKlareeHoliday(null), false);
});

test("Seasonal greeting uses a full-width banner and a user-opened accessible dialog", () => {
  const src = fs.readFileSync(path.join(process.cwd(), "src", "App.jsx"), "utf8");
  const css = fs.readFileSync(path.join(process.cwd(), "src", "klaree-seasonal.css"), "utf8");
  assert.ok(src.includes("hero-grid--seasonal"), "Seasonal grid must span the homepage hero");
  assert.ok(src.includes("klareeSeasonal.teaser"), "Seasonal teaser must match the selected language and type");
  assert.ok(src.includes("klaree-event-sun"), "Summer scene must be rendered");
  assert.ok(src.includes("klaree-event-leaf"), "Autumn scene must be rendered");
  assert.ok(css.includes(".klaree-event-banner--summer"), "Summer scene must have distinct styling");
  assert.ok(css.includes(".klaree-event-banner--autumn"), "Autumn scene must have distinct styling");
  assert.ok(src.includes('className="klaree-event-cta"'), "Seasonal banner must have a button");
  assert.ok(src.includes('className="klaree-event-dismiss"'), "Banner must be dismissible");
  assert.ok(src.includes('aria-haspopup="dialog"'), "Greeting opens only by explicit click");
  assert.ok(src.includes('aria-controls="klaree-seasonal-dialog"'));
  assert.ok(src.includes('id="klaree-seasonal-dialog"'), "Native dialog is accessible");
  assert.ok(src.includes("showModal()"), "Native modal must be opened by direct interaction");
  assert.ok(css.includes("grid-area: event;"), "Seasonal banner is full width");
  assert.ok(css.includes("grid-template-areas:"), "Seasonal layout must retain main form");
  assert.ok(css.includes("klaree-greeting-dialog::backdrop"), "Greeting needs backdrop style");
  assert.ok(!src.includes("Jetzt mitmachen"), "Unfinished Easter game must not be promoted");
  assert.ok(src.includes('getKlareeSeasonalMoment({'));
  assert.ok(src.includes('stateCode: selectedCode'));
  assert.ok(!src.includes("statutory holiday on 24 December"));
  assert.ok(css.includes(":focus-visible"));
  assert.ok(css.includes("prefers-reduced-motion: reduce"));
  const image = fs.readFileSync(path.join(process.cwd(), "public", "klaree-christmas-2026.webp"));
  assert.equal(image.toString("ascii", 0, 4), "RIFF");
  assert.equal(image.toString("ascii", 8, 12), "WEBP");
});

test("Seasonal controls provide German and English labels for optional dismissal", () => {
  for (const lang of ["de", "en"]) {
    const c = getKlareeGreetingControls(lang);
    assert.ok(c.open && c.close && c.later && c.dismiss, lang);
  }
});

test("Recurring Easter dates match known 2026–2032 Sundays, and include both exact boundaries", () => {
  const dates = [
    [2026, "2026-04-05", "2026-03-22", "2026-04-12"],
    [2027, "2027-03-28", "2027-03-14", "2027-04-04"],
    [2028, "2028-04-16", "2028-04-02", "2028-04-23"],
    [2029, "2029-04-01", "2029-03-18", "2029-04-08"],
    [2030, "2030-04-21", "2030-04-07", "2030-04-28"],
    [2031, "2031-04-13", "2031-03-30", "2031-04-20"],
    [2032, "2032-03-28", "2032-03-14", "2032-04-04"],
  ];
  const asLocalDate = (key) => {
    const [year, month, day] = key.split("-").map(Number);
    return localDate(year, month, day);
  };
  for (const [year, sunday, start, end] of dates) {
    assert.deepEqual(getKlareeEasterWindow(year), { year, sunday, start, end });
    assert.equal(isKlareeEasterEventDate(asLocalDate(start)), true, `${year} first day`);
    assert.equal(isKlareeEasterEventDate(asLocalDate(sunday)), true, `${year} Easter Sunday`);
    assert.equal(isKlareeEasterEventDate(asLocalDate(end)), true, `${year} final day`);
    const before = new Date(asLocalDate(start).getTime() - 86400000);
    const after = new Date(asLocalDate(end).getTime() + 86400000);
    assert.equal(isKlareeEasterEventDate(before), false, `${year} before window`);
    assert.equal(isKlareeEasterEventDate(after), false, `${year} after window`);
  }
  assert.equal(getKlareeEasterWindow(2027.5), null);
  assert.equal(getKlareeEasterWindow(0), null);
  assert.equal(isKlareeEasterEventDate(null), false);
  assert.equal(isKlareeEasterEventDate(new Date("invalid")), false);
});

test("Future years without verified holiday datasets still get an Easter greeting, but never holiday claims", () => {
  for (const year of [2031, 2032, 2035]) {
    const event = getKlareeEasterWindow(year);
    const [y, m, d] = event.sunday.split("-").map(Number);
    const moment = getKlareeSeasonalMoment({
      date: localDate(y, m, d), stateCode: "BY",
    });
    assert.equal(moment?.kind, "easter");
    assert.equal(moment?.statutory, false);
    assert.equal(moment?.isPreview, false);
  }
});

test("Calculated Easter matches verified Good Friday and Easter Monday across published state datasets", () => {
  const known = index.datasets.filter(({ year }) => year >= 2026 && year <= 2030);
  assert.ok(known.length >= 16, "Expect at least one year's published statewide data");
  for (const { bundeslandCode, year } of known) {
    const data = holidayData(bundeslandCode, year);
    const friday = data.holidays?.find((item) => item.id?.endsWith("-good-friday") &&
      item.scope === "statewide" && item.type === "public_holiday");
    const monday = data.holidays?.find((item) => item.id?.endsWith("-easter-monday") &&
      item.scope === "statewide" && item.type === "public_holiday");
    assert.ok(friday && monday, `${bundeslandCode} ${year} needs Good Friday and Easter Monday`);
    const { sunday } = getKlareeEasterWindow(year);
    const sundayUTC = Date.parse(`${sunday}T00:00:00Z`);
    assert.equal(friday.date, new Date(sundayUTC - 2 * 86400000).toISOString().slice(0, 10),
      `${bundeslandCode} ${year} Good Friday`);
    assert.equal(monday.date, new Date(sundayUTC + 86400000).toISOString().slice(0, 10),
      `${bundeslandCode} ${year} Easter Monday`);
  }
});
