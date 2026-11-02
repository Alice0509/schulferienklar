import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("high-impression search pages get specific, truthful title and description variants", async () => {
  const source = await read("../scripts/generate-seo-pages.mjs");
  assert.ok(source.includes("Ferien Berlin 2027: Schulferien, Kalender & PDF"));
  assert.ok(source.includes("Ferien Sachsen 2027: Schulferien, Kalender & PDF"));
  assert.ok(source.includes("Schulferien Hessen 2028: Termine, Kalender & PDF"));
  assert.ok(source.includes("Winter-, Sommer- und Herbstferien"));
  assert.ok(source.includes("Winter-, Oster- und Sommerferien"));
  assert.ok(source.includes('code === "HE" && year === 2028'));
  assert.ok(source.includes('"berlin-2027"'));
  assert.ok(source.includes('"sachsen-2027"'));
  assert.ok(source.includes('searchHighlightTypes: ["autumn", "winter"]'));
  assert.ok(source.includes('searchHighlightTypes: ["summer", "winter"]'));
  assert.ok(source.includes('year === 2028 ? ["summer", "autumn"] : []'));
});

test("landing-page shortcuts derive dates from existing holiday data and link to original rows", async () => {
  const [source, css] = await Promise.all([
    read("../scripts/generate-seo-pages.mjs"),
    read("../public/seo-pages.css"),
  ]);
  const start = source.indexOf("function stateYearSearchHighlightsHtml(");
  const end = source.indexOf("function stateYearGoldPageTemplate(", start);
  assert.ok(start >= 0 && end > start);
  const helper = source.slice(start, end);
  assert.ok(helper.includes("findStateYearGoldEvent(events, type, year)"));
  assert.ok(helper.includes("formatDate(event.startDate)"));
  assert.ok(helper.includes("formatDate(event.endDate)"));
  assert.ok(helper.includes("String(event.id || event.type)"));
  assert.ok(helper.includes('href="#'));
  assert.ok(helper.includes("if (!highlights.length) return"));
  assert.ok(source.includes("types: searchHighlightTypes"));
  assert.match(css, /\.gold-search-highlights \{/);
  assert.match(css, /\.gold-search-highlights a:focus-visible/);
});

test("changes leave all other years with their existing title templates", async () => {
  const source = await read("../scripts/generate-seo-pages.mjs");
  assert.ok(source.includes("Schulferien Bayern 2027: Termine und freie Zeit"));
  assert.ok(source.includes("Schulferien NRW 2027: Termine & bewegliche Ferientage"));
  assert.ok(source.includes('`Schulferien ${name} ${year}: Termine und freie Tage`'));
  assert.ok(source.includes("title = `Schulferien ${name} ${year} – Schulferienklar`"));
});
