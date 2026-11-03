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
    for (const key of ["calendar","garden","sidebar","progressLabel","privacy","preview","privacyLink","imprintLink","brandLabel","navigationLabel","legalLabel"]) {
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

test("Illustrated garden keeps nine distinct accessible targets and Klaree in the scene", () => {
  const read = (name) => fs.readFileSync(path.join(process.cwd(), name), "utf8");
  const html = read("public/klaree-ostern-2027.html");
  const css = read("public/klaree-easter-preview.css");
  const game = read("public/klaree-easter-game.mjs");
  assert.ok(html.includes('class="garden-landscape"'));
  assert.ok(html.includes('id="garden-character"'));
  assert.ok(html.includes('id="game-klaree"'));
  assert.ok(html.includes('id="game-garden-label"'));
  assert.ok(html.includes('class="treat-ledger"'));
  assert.equal((html.match(/class="treat-token"/g) || []).length, TREAT_COUNT);
  assert.equal((html.match(/style="--x:/g) || []).length, SPOTS.length);
  assert.ok(css.includes('.garden-board .spot'));
  assert.ok(css.includes('@media (max-width: 480px)'));
  assert.ok(css.includes('prefers-reduced-motion: reduce'));
  assert.ok(game.includes('slots.reset.hidden = true'), "Restart must not be shown before interaction");
  assert.ok(game.includes('slots.reset.hidden = false'), "Restart must become available after interaction");
  assert.ok(game.includes('slots.tokens.forEach'), "Treat progress must update after each find");
});

test("Klaree reacts with localized story beats at the first and third finds", () => {
  const de = getEasterCopy("de");
  const en = getEasterCopy("en");
  for (const lang of [de, en]) {
    assert.ok(lang.gardenLabel);
    assert.ok(lang.ready);
    assert.ok(lang.foundAt("bench", 1));
    assert.ok(lang.emptyAt("bench"));
    assert.notEqual(lang.foundAt("bench", 1), lang.foundAt("bench", 2));
    assert.notEqual(lang.foundAt("bench", 2), lang.foundAt("bench", 3));
  }
  assert.match(de.foundAt("Bank", 1), /Schwanz/);
  assert.match(de.foundAt("Bank", 3), /Hälfte/);
  assert.match(en.foundAt("Bench", 1), /tail wag/);
  assert.match(en.foundAt("Bench", 3), /halfway/);
  assert.equal(de.foundAt("Bank", 2).includes("Mehr als die Hälfte"), false);
});

test("Checked hiding places stay keyboard focusable but cannot be searched twice", () => {
  const game = fs.readFileSync(path.join(process.cwd(), "public/klaree-easter-game.mjs"), "utf8");
  const css = fs.readFileSync(path.join(process.cwd(), "public/klaree-easter-preview.css"), "utf8");
  assert.ok(game.includes('tile.setAttribute("aria-disabled", "true")'));
  assert.ok(game.includes('tile.removeAttribute("aria-disabled")'));
  assert.ok(game.includes('remaining.setAttribute("aria-disabled", "true")'));
  assert.ok(game.includes('tile.matches?.(":focus-visible")'), "Keyboard players can focus restart when finished");
  assert.ok(!game.includes("tile.disabled = true"), "Native disabled buttons lose keyboard focus");
  assert.ok(!game.includes("tile.disabled = false"));
  assert.ok(css.includes('.spot[aria-disabled="true"]'));
  assert.ok(css.includes(':not([aria-disabled="true"])'));
  const round = createEasterRound(() => 0.25);
  for (const spot of SPOTS) {
    const first = round.check(spot);
    assert.equal(round.check(spot).kind, "ignored");
    assert.ok(["treat", "empty", "ignored"].includes(first.kind));
  }
  assert.equal(round.found, TREAT_COUNT);
});
