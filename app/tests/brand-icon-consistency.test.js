import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const pages = [
  "index.html",
  "en/calendar.html",
  "src/App.jsx",
  "public/datenquellen.html",
  "public/datenschutz.html",
  "public/ferienplanung.html",
  "public/germany-travel-checker.html",
  "public/impressum.html",
  "public/support.html",
  "public/travel-germany-school-holidays.html",
  "public/ueber-uns.html",
];

test("home and informational page logos use the search favicon's artwork", () => {
  for (const file of pages) {
    const source = read(file);
    assert.ok(source.includes('src="/favicon.svg"'), `${file}: missing brand icon`);
    assert.ok(!source.includes("brand-mark.png"), `${file}: stale old S mark`);
  }
});

test("SEO page headings do not paint the obsolete white letter S", () => {
  const css = read("public/seo-pages.css");
  const block = css.match(/\.seo-brand::before\s*\{([^}]+)\}/)?.[1];
  assert.ok(block, "SEO header icon style missing");
  assert.ok(block.includes('url("/favicon.svg")'), "SEO header icon is inconsistent");
  assert.ok(!block.includes('content: "S"'), "SEO page still paints old S");
});

test("vacation planner navigation uses the same icon", () => {
  const template = read("scripts/generate-urlaubsplaner-page.mjs");
  assert.ok(template.includes('<img src="/favicon.svg"'), "Planner header lacks favicon artwork");
  assert.ok(!template.includes('<span aria-hidden="true">✓</span>'), "Planner still has checkmark");
  assert.ok(read("public/urlaubsplaner.css").includes(".planner-brand img"));
});

test("browser icons and PWA SVG share one branded S", () => {
  const icon = read("public/favicon.svg");
  const legacy = read("public/pwa-icon.svg");
  assert.equal(legacy, icon, "PWA SVG uses a different, older symbol");
  const manifest = JSON.parse(read("public/manifest.webmanifest"));
  assert.ok(manifest.icons.some(({ src }) => src === "/favicon.svg"));
  for (const file of ["index.html", "en/calendar.html"]) {
    assert.ok(read(file).includes('href="/favicon.svg"'));
  }
});
