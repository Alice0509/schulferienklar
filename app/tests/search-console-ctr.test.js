import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { STATES, YEARS } from "../scripts/lib/site-config.mjs";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("the 16 states and five years share the same seasonal planning feature", async () => {
  const source = await read("../scripts/generate-seo-pages.mjs");
  assert.equal(STATES.length, 16);
  assert.deepEqual(YEARS, [2026, 2027, 2028, 2029, 2030]);
  assert.equal(STATES.length * YEARS.length, 80);
  assert.equal(
    source.split("${stateYearSearchHighlightsHtml({ events, name, year })}").length - 1,
    3,
    "gold templates, Bayern special template, and 2030 partial template"
  );
  assert.ok(!source.includes("searchHighlightTypes"));
  assert.ok(!source.includes("code === \"HE\" && year === 2028"));
});

test("date shortcuts use existing official events and their exact row IDs", async () => {
  const [source, css] = await Promise.all([
    read("../scripts/generate-seo-pages.mjs"),
    read("../public/seo-pages.css"),
  ]);
  const start = source.indexOf("function stateYearSearchHighlightsHtml(");
  const end = source.indexOf("function stateYearGoldPageTemplate(", start);
  assert.ok(start > 0 && end > start);
  const helper = source.slice(start, end);
  assert.ok(helper.includes("findStateYearGoldEvent(events, type, year)"));
  assert.ok(helper.includes("formatDate(event.startDate)"));
  assert.ok(helper.includes("formatDate(event.endDate)"));
  assert.ok(helper.includes("String(event.id || event.type)"));
  assert.ok(helper.includes("if (!highlights.length) return"));
  assert.match(css, /\.gold-search-highlights \{/);
  assert.match(css, /\.gold-search-highlights a:focus-visible/);

  const context = {
    findStateYearGoldEvent: (events, type, year) =>
      events.find((item) => item.type === type &&
        item.startDate.startsWith(String(year))),
    getHolidayName: (event) => event.name,
    escapeHtml: (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;"),
    formatDate: (date) => date,
  };
  const html = runInNewContext(`${helper}\nstateYearSearchHighlightsHtml({
    events: [
      { id: "ferien-sommer", type: "summer", name: "Sommerferien", startDate: "2028-06-01", endDate: "2028-07-10" },
      { id: "ferien-herbst", type: "autumn", name: "Herbstferien", startDate: "2028-10-02", endDate: "2028-10-15" },
      { id: "ferien-ostern", type: "easter", name: "Osterferien", startDate: "2028-03-10", endDate: "2028-03-20" },
    ], name: "Saarland", year: 2028
  })`, context);
  assert.match(html, /Ferienzeiten Saarland 2028 auf einen Blick/);
  assert.match(html, /href="#termin-ferien-sommer"/);
  assert.match(html, /href="#termin-ferien-herbst"/);
  assert.match(html, /2028-06-01/);
  assert.doesNotMatch(html, /Winterferien/);
});

test("incomplete 2030 calendars remain partial and never gain fabricated holidays", async () => {
  const source = await read("../scripts/generate-seo-pages.mjs");
  const start = source.indexOf("function stateYearSearchHighlightsHtml(");
  const end = source.indexOf("function stateYearGoldPageTemplate(", start);
  const helper = source.slice(start, end);
  const context = {
    findStateYearGoldEvent: (events, type, year) =>
      events.find((item) => item.type === type &&
        item.startDate.startsWith(String(year))),
    getHolidayName: (event) => event.name,
    escapeHtml: (value) => String(value),
    formatDate: (value) => value,
  };
  assert.equal(runInNewContext(`${helper}\nstateYearSearchHighlightsHtml({
    events: [], name: "Bremen", year: 2030
  })`, context), "");
  assert.ok(source.includes("stateYearDataCoverageHtml({ code, name, year })"));
  assert.ok(source.includes("Teilübersicht"));
});

test("state-specific exceptions, sources and existing SEO titles are preserved", async () => {
  const source = await read("../scripts/generate-seo-pages.mjs");
  for (const title of [
    "Schulferien Berlin 2027: Termine und freie Tage",
    "Schulferien Sachsen 2027: Termine und freie Tage",
    "Schulferien Bayern 2027: Termine und freie Zeit",
    "Schulferien NRW 2027: Termine & bewegliche Ferientage",
    "`Schulferien ${name} ${year}: Termine und freie Tage`",
    "title = `Schulferien ${name} ${year} – Schulferienklar`",
  ]) assert.ok(source.includes(title), title);
  assert.ok(source.includes("getSchoolHolidaySourceForState"));
  assert.ok(source.includes("stateYearGoldPeriodRowsHtml"));
});
