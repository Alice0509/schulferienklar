import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  FIRST_PEEK_MS, HUNT_GOAL, PEEK_INTERVAL_MIN_MS, PEEK_INTERVAL_MAX_MS,
  PEEK_VISIBLE_MS, findSafePeek, getHomeHuntCopy, intersectsBox, nextPeekInterval,
} from "../src/klaree-home-hunt.js";

const read = (name) => fs.readFileSync(path.join(process.cwd(), name), "utf8");

test("Easter encounters arrive no faster than 15s and no slower than 30s", () => {
  assert.equal(HUNT_GOAL, 5);
  assert.equal(FIRST_PEEK_MS, 15000);
  assert.equal(PEEK_VISIBLE_MS, 25000,
    "Klaree stays visible long enough to find, including while the page scrolls");
  assert.equal(nextPeekInterval(() => 0), PEEK_INTERVAL_MIN_MS);
  assert.equal(nextPeekInterval(() => .999999999), PEEK_INTERVAL_MAX_MS);
  assert.equal(nextPeekInterval(() => .5), 22500);
  assert.equal(nextPeekInterval(() => Number.NaN), PEEK_INTERVAL_MIN_MS);
  assert.equal(nextPeekInterval(() => 25), PEEK_INTERVAL_MAX_MS);
});

test("Klaree can use six viewport positions without covering known interactive rectangles", () => {
  const first = findSafePeek({ width: 1280, height: 900, random: () => 0 });
  assert.equal(first.id, "upper-left");
  assert.ok(first.left >= 12 && first.top >= 66);
  const second = findSafePeek({ width: 1280, height: 900, previousId: first.id, random: () => 0 });
  assert.notEqual(second.id, first.id, "consecutive peeks must move");
  const unavailable = findSafePeek({
    width: 1280, height: 900,
    obstacles: [{ left: 0, right: 1280, top: 0, bottom: 900 }],
  });
  assert.equal(unavailable, null, "never place Klaree over an obstructed page");
  const tiny = findSafePeek({ width: 280, height: 700 });
  assert.equal(tiny, null);
  assert.equal(intersectsBox(
    { left: 10, right: 80, top: 10, bottom: 80 },
    { left: 81, right: 120, top: 20, bottom: 100 }, 2,
  ), true);
  assert.equal(intersectsBox(
    { left: 10, right: 80, top: 10, bottom: 80 },
    { left: 200, right: 250, top: 200, bottom: 260 }, 2,
  ), false);
});

test("Mobile positions keep Klaree away from bottom browser controls", () => {
  for (const width of [320, 375, 390, 600, 768]) {
    for (const height of [568, 667, 844]) {
      const peek = findSafePeek({ width, height, random: () => 0 });
      assert.ok(peek, `${width}x${height}`);
      assert.ok(peek.left >= 0 && peek.right <= width);
      assert.ok(peek.bottom <= height - 85);
    }
  }
});

test("Easter cameo text is bilingual with gentle, non-commercial discovery feedback", () => {
  const de = getHomeHuntCopy("de");
  const en = getHomeHuntCopy("en");
  for (const copy of [de, en]) {
    assert.ok(copy.title && copy.intro && copy.preview && copy.summon);
    assert.ok(copy.hide && copy.resume && copy.peek && copy.completed && copy.again);
    assert.ok(copy.found(1) && copy.found(3) && copy.found(5));
    assert.equal(copy.progress(5).includes("5"), true);
  }
  assert.notEqual(de.title, en.title);
  assert.equal(getHomeHuntCopy("unknown"), de);
});

test("Easter encounter is on the homepage, never a forced popup or redirect", () => {
  const home = read("src/App.jsx");
  const widget = read("src/KlareeHomeHunt.jsx");
  const css = read("src/klaree-home-hunt.css");
  assert.ok(home.includes('import KlareeHomeHunt'));
  assert.ok(home.includes('klaree-hunt-preview'));
  assert.ok(home.includes("const showKlareeHomeHunt = klareeHuntPreview;"),
    "Unapproved experience must run only behind the preview query");
  assert.ok(!home.includes('klareeSeasonal?.kind === "easter" && !klareeSeasonal.isPreview'),
    "Public Easter activation requires a separate launch PR");
  assert.ok(home.includes('<KlareeHomeHunt locale={locale} preview={klareeHuntPreview} />'));
  assert.ok(widget.includes("window.setTimeout"), "Auto appearance must use a scoped, cancellable timer");
  assert.ok(widget.includes("window.clearTimeout"), "Timers must be cleaned up");
  assert.ok(widget.includes('document.addEventListener("visibilitychange"'), "Background tabs must be paused");
  assert.ok(widget.includes("prefers-reduced-motion: reduce"));
  assert.ok(widget.includes("viewportObstacles(document)"));
  assert.ok(widget.includes("viewportObstacles(document, peekRef.current)"),
    "Rechecking a visible cameo must exclude its own button from obstacles");
  assert.ok(widget.includes('window.addEventListener("scroll", onViewportChange'),
    "Scroll must recheck safety rather than immediately dismiss Klaree");
  assert.ok(widget.includes('window.addEventListener("resize", onViewportChange'),
    "Resizing must reposition Klaree if the old spot becomes unsafe");
  assert.ok(widget.includes("if (!tooClose && !outOfView) return"),
    "Klaree stays at the same spot when it is still clear");
  assert.ok(!widget.includes("Math.max(3000, nextPeekInterval() - PEEK_VISIBLE_MS)"),
    "The next appearance delay starts only after Klaree disappears");
  assert.ok(!widget.includes('const onScroll = () => {'),
    "Even a tiny scroll must not instantly dismiss the cameo");
  assert.ok(widget.includes("setHidden(true)"));
  assert.ok(widget.includes("keyboardSummon.current"));
  assert.ok(widget.includes("role=\"status\" aria-live=\"polite\""));
  assert.ok(css.includes(".klaree-home-peek:focus-visible"));
  assert.ok(css.includes("@media (max-width: 600px)"));
  assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"));
  assert.ok(!widget.includes("showModal()"));
  assert.ok(!widget.includes("location.href"));
  for (const p of [widget, css, read("src/klaree-home-hunt.js")]) {
    for (const forbidden of ["adsbygoogle.push", "gtag(", "localStorage.setItem", "sessionStorage.setItem", "new Audio("]) {
      assert.ok(!p.includes(forbidden), `Unexpected tracking/storage/sound: ${forbidden}`);
    }
  }
  assert.ok(!read("public/klaree-ostern-2027.html").includes("adsbygoogle"));
});
