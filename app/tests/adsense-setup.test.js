import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (relativePath) =>
  readFile(new URL(relativePath, import.meta.url), "utf8");

const publisherId = "ca-pub-8336348698974993";
const tag = 'data-schulferienklar-adsense="true"';

test("main entry and generated content templates include the approved AdSense tag", async () => {
  const [home, seoGenerator, plannerGenerator] = await Promise.all([
    read("../index.html"),
    read("../scripts/generate-seo-pages.mjs"),
    read("../scripts/generate-urlaubsplaner-page.mjs"),
  ]);

  for (const [label, source] of [
    ["home", home],
    ["SEO pages", seoGenerator],
    ["vacation planner", plannerGenerator],
  ]) {
    assert.ok(source.includes(publisherId), label);
    assert.ok(source.includes(tag), label);
    assert.match(source, /pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/);
    assert.equal(source.split(tag).length - 1, 1, label + " must load once");
  }

  assert.match(seoGenerator, /function sharedSeoStyles\(\)/);
  assert.match(plannerGenerator, /privacy-analytics\.js/);
});

test("ads.txt uses the same account, while embedded widgets and legal pages stay ad-free", async () => {
  const [adsTxt, privacyPage, widget, embeddedWidget] = await Promise.all([
    read("../public/ads.txt"),
    read("../public/datenschutz.html"),
    read("../public/widget.html"),
    read("../public/widgets/naechste-schulferien.html"),
  ]);

  assert.match(adsTxt, /google\.com, pub-8336348698974993, DIRECT/);
  for (const content of [privacyPage, widget, embeddedWidget]) {
    assert.doesNotMatch(content, /pagead2\.googlesyndication\.com/);
  }
  assert.match(privacyPage, /Werbung auf der Website mit Google AdSense/);
});

test("Clarity retains separate consent and defers its banner until the Google CMP is ready", async () => {
  const consentScript = await read("../public/privacy-analytics.js");
  assert.match(consentScript, /CONSENT_DATA_READY/);
  assert.doesNotMatch(consentScript, /CONSENT_MODE_DATA_READY: showClarityAfterGoogle/);
  assert.match(consentScript, /CONSENT_API_READY/);
  assert.match(consentScript, /showRevocationMessage/);
  assert.match(consentScript, /!googleConsentActive/);
  assert.match(consentScript, /getConsent\(\) === null/);
});
