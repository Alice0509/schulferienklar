import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { SPOTS, TREAT_COUNT, createEasterRound, getEasterCopy } from "../public/klaree-easter-game.mjs";

test("Every round hides exactly five treats among nine locations", () => {
  for (const random of [() => 0, () => 0.5, () => 0.999, Math.random]) {
    const game = createEasterRound(random);
    assert.equal(SPOTS.length, 9);
    assert.equal(new Set(SPOTS).size, 9);
    const results = SPOTS.map((spot) => game.check(spot));
    assert.equal(results.filter((result) => result.kind === "treat").length, TREAT_COUNT);
    assert.equal(game.found, TREAT_COUNT);
    assert.equal(results.at(-1).complete, true);
  }
});

test("Repeated taps, invalid places and taps after winning cannot inflate results", () => {
  const round = createEasterRound(() => 0.25);
  assert.equal(round.check("unknown").kind, "ignored");
  const first = round.check(SPOTS[0]);
  assert.ok(["treat","empty"].includes(first.kind));
  assert.equal(round.check(SPOTS[0]).kind, "ignored");
  assert.equal(round.found, first.found);
  for (const spot of SPOTS.slice(1)) round.check(spot);
  assert.equal(round.found, 5);
  assert.equal(round.check(SPOTS[1]).kind, "ignored");
});

test("Both languages cover every garden location and key responses", () => {
  const de = getEasterCopy("de");
  const en = getEasterCopy("en");
  for (const lang of [de, en]) {
    for (const location of SPOTS) assert.ok(lang.locations[location]);
    for (const key of ["headline","intro","instruction","found","none","complete","reset"]) assert.ok(lang[key]);
  }
  assert.notEqual(de.headline, en.headline);
  for (const lang of [de, en]) {
    for (const key of ["calendar","garden","sidebar","progressLabel","privacy","preview","privacyLink","imprintLink"]) {
      assert.ok(lang[key], `Missing translation: ${key}`);
    }
  }
  assert.equal(getEasterCopy("fr"), de);
});

test("Preview stays unlinked, unindexed, ad-free and accessible", () => {
  const read = (name) => fs.readFileSync(path.join(process.cwd(), name), "utf8");
  const html = read("public/klaree-ostern-2027.html");
  assert.match(html, /name="robots" content="noindex,nofollow,noarchive"/);
  assert.equal((html.match(/data-spot="/g) || []).length, SPOTS.length);
  assert.ok(html.includes('role="status" aria-live="polite"'));
  assert.ok(html.includes('id="game-progress"'));
  assert.ok(html.includes('src="/klaree-walk.webp"'));
  assert.ok(html.includes('src="/favicon.svg"'));
  for (const prohibited of ["adsbygoogle","adsense","gtag(","googletagmanager","clarity.ms","localStorage","<iframe"]) {
    assert.ok(!html.includes(prohibited), `Preview must not load ${prohibited}`);
  }
  const seoGenerator = read("scripts/generate-seo-pages.mjs");
  assert.ok(!seoGenerator.includes("/klaree-ostern-2027.html"), "Preview must not be in sitemap");
  for (const file of ["index.html","en/calendar.html","src/App.jsx"]) {
    assert.ok(!read(file).includes("klaree-ostern-2027.html"), `No homepage promotion yet: ${file}`);
  }
  const css = read("public/klaree-easter-preview.css");
  assert.ok(css.includes(":focus-visible"));
  assert.ok(css.includes("prefers-reduced-motion: reduce"));
});
