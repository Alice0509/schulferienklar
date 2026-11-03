import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  couldHaveKlareeHoliday, getKlareeSeasonalMoment, getKlareeGreetingControls,
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

test("Ordinary days remain a quiet day-of-week/time-of-day Klaree", () => {
  assert.equal(season(2026, 11, 3), null);
  assert.equal(season(2026, 12, 23), null);
  assert.equal(season(2026, 12, 27), null);
  assert.equal(season(2027, 3, 23), null);
  assert.equal(season(2027, 3, 30), null);
});

test("Christmas is a seasonal greeting with a red cape, never an inaccurate December 24 public holiday label", () => {
  for (const day of [24, 25, 26]) {
    const moment = season(2026, 12, day);
    assert.equal(moment?.kind, "christmas");
    assert.equal(moment.image, "/klaree-christmas-2026.webp");
    assert.equal(moment.statutory, false);
    assert.match(moment.title, /Weihnachten/);
  }
  const withoutData = getKlareeSeasonalMoment({ date: localDate(2026, 12, 24), stateCode: "BY" });
  assert.equal(withoutData.kind, "christmas");
  assert.equal(withoutData.statutory, false);
});

test("Easter range comes from the selected state's CURRENT-year dataset, not a hardcoded date", () => {
  for (const day of [24, 25, 26, 27, 28, 29]) {
    assert.equal(season(2027, 3, day)?.kind, "easter", `2027-03-${day}`);
  }
  for (const day of [1, 2, 3, 4, 5, 6]) {
    assert.equal(season(2026, 4, day)?.kind, "easter", `2026-04-${day}`);
  }
  assert.equal(getKlareeSeasonalMoment({
    date: localDate(2027, 3, 28), stateCode: "BY", holidayDataset: holidayData("BY", 2026),
  }), null, "Planning another year must not alter today's Klaree");
});

test("State-specific holidays appear only where verified statewide, never on regional/local exceptions", () => {
  const inBerlin = season(2026, 3, 8, "BE");
  const inBavaria = season(2026, 3, 8, "BY");
  assert.equal(inBerlin?.title, "Internationaler Frauentag");
  assert.equal(inBerlin?.statutory, true);
  assert.equal(inBavaria, null);
  assert.equal(season(2026, 1, 6, "BY")?.title, "Heilige Drei Könige");
  assert.equal(season(2026, 1, 6, "BE"), null);
  assert.equal(season(2026, 10, 31, "SN")?.title, "Reformationstag");
  assert.equal(season(2026, 10, 31, "BY"), null);
  assert.equal(season(2026, 8, 15, "BY"), null, "Regional Mariä Himmelfahrt is not statewide");
  assert.equal(season(2026, 8, 8, "BY"), null, "Augsburg-only holiday cannot be a Bavaria-wide claim");
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

test("Preview parameters are conspicuously labeled, isolated and not official holidays", () => {
  for (const language of ["de", "en"]) {
    for (const preview of ["christmas", "easter"]) {
      const demo = season(2026, 11, 3, "BY", language, preview);
      assert.equal(demo.kind, preview);
      assert.equal(demo.isPreview, true);
      assert.ok(demo.previewLabel);
      assert.equal(demo.statutory, false);
    }
  }
  assert.equal(season(2026, 11, 3, "BY", "de", "unknown"), null);
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
