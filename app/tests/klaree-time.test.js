import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import process from "node:process";
import path from "node:path";
import { getKlareeMoment } from "../src/klaree-time.js";

const phases = [
  { key: "morning", hours: [5, 6, 7, 8, 9, 10], image: "/klaree-walk.webp" },
  { key: "daytime", hours: [11, 12, 13, 14, 15, 16], image: "/klaree-calendar.webp" },
  { key: "evening", hours: [17, 18, 19, 20, 21], image: "/klaree-mascot.webp" },
  { key: "night", hours: [22, 23, 0, 1, 2, 3, 4], image: "/klaree-rest.webp" },
];

test("Klaree uses exactly one predictable pose for every local hour", () => {
  const allHours = phases.flatMap(({ hours }) => hours).sort((a, b) => a - b);
  assert.deepEqual(allHours, Array.from({ length: 24 }, (_, hour) => hour));
  for (const { hours, key, image } of phases) {
    for (const hour of hours) {
      const result = getKlareeMoment(hour);
      assert.equal(result.key, key, `Wrong phase at ${hour}:00`);
      assert.equal(result.image, image);
      assert.ok(result.alt);
      assert.ok(result.line);
    }
  }
});

test("German and English poses match and provide separate localized copy", () => {
  for (let hour = 0; hour < 24; hour++) {
    const de = getKlareeMoment(hour, "de");
    const en = getKlareeMoment(hour, "en");
    assert.equal(de.key, en.key);
    assert.equal(de.image, en.image);
    assert.notEqual(de.line, en.line);
    assert.notEqual(de.alt, en.alt);
  }
});

test("Unknown device hours and locales have a safe, deterministic fallback", () => {
  assert.equal(getKlareeMoment(-1).key, "daytime");
  assert.equal(getKlareeMoment(24).key, "daytime");
  assert.equal(getKlareeMoment(Number.NaN).key, "daytime");
  assert.equal(getKlareeMoment(8.5).key, "daytime");
  assert.equal(getKlareeMoment(8, "fr").line, getKlareeMoment(8, "de").line);
});

test("Every chosen pose is an existing local static image", () => {
  for (const { image } of phases) {
    assert.ok(fs.existsSync(path.join(process.cwd(), "public", image.slice(1))), image);
  }
});

test("Homepage cameo stays one-shot, visible and motion-accessible", () => {
  const css = fs.readFileSync(path.join(process.cwd(), "src/App.css"), "utf8");
  const jsx = fs.readFileSync(path.join(process.cwd(), "src/App.jsx"), "utf8");
  assert.ok(css.includes("@keyframes klaree-entrance"));
  assert.ok(css.includes("prefers-reduced-motion: reduce"));
  assert.ok(css.includes("animation: none !important"));
  assert.ok(!css.includes("infinite") || !css.slice(css.indexOf("/* Klaree's one-time visit:")).includes("infinite"));
  assert.ok(jsx.includes('className="klaree-hero-stage"'));
  assert.ok(jsx.includes("data-klaree-moment={klareeMoment.key}"));
});
