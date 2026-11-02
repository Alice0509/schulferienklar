import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
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
  assert.match(consentScript, /window\.__tcfapi\("addEventListener", 2/);
  assert.match(consentScript, /tcData\.eventStatus === "useractioncomplete"/);
  assert.match(consentScript, /tcData\.eventStatus === "tcloaded"/);
  assert.doesNotMatch(consentScript, /CONSENT_DATA_READY: showClarityAfterGoogle/);
  assert.doesNotMatch(consentScript, /CONSENT_MODE_DATA_READY: showClarityAfterGoogle/);
  assert.match(consentScript, /CONSENT_API_READY/);
  assert.match(consentScript, /showRevocationMessage/);
  assert.match(consentScript, /!googleConsentActive/);
  assert.match(consentScript, /getConsent\(\) === null/);
});

test("Clarity never opens over Google's consent UI", async () => {
  const source = await read("../public/privacy-analytics.js");
  let consentListener;
  const timers = [];
  const appended = [];
  const documentHandlers = new Map();

  const footer = { appendChild() {} };
  const document = {
    querySelector(selector) {
      if (selector === "footer") return footer;
      if (selector === 'script[data-schulferienklar-adsense="true"]') return {};
      return null;
    },
    getElementById() { return null; },
    addEventListener(name, callback) { documentHandlers.set(name, callback); },
    createElement() {
      return {
        dataset: {},
        appendChild() {},
        addEventListener() {},
        querySelector() { return { addEventListener() {} }; },
      };
    },
    head: { appendChild() {} },
    body: { appendChild(element) { appended.push(element); } },
  };
  const window = {
    googlefc: { callbackQueue: [] },
    setTimeout(callback) { timers.push(callback); },
    __tcfapi(command, version, callback) {
      assert.equal(command, "addEventListener");
      assert.equal(version, 2);
      consentListener = callback;
    },
  };
  const localStorage = { getItem() { return null; } };
  runInNewContext(source, { document, window, localStorage });

  documentHandlers.get("DOMContentLoaded")();
  window.googlefc.callbackQueue.find((item) => item.CONSENT_API_READY)
    .CONSENT_API_READY();
  assert.equal(typeof consentListener, "function");

  // Google consent UI is visible. We must not open the analytics dialog.
  consentListener({ eventStatus: "cmpuishown" }, true);
  assert.equal(timers.length, 0);
  assert.equal(appended.length, 0);

  // Only after a completed Google choice can Clarity request separate consent.
  consentListener({ eventStatus: "useractioncomplete" }, true);
  assert.equal(timers.length, 1);
  assert.equal(appended.length, 0);
  timers[0]();
  assert.equal(appended.length, 1);
  assert.equal(appended[0].className, "sf-consent-layer");

  // Duplicate CMP events must not create repeated Clarity dialogs.
  consentListener({ eventStatus: "useractioncomplete" }, true);
  assert.equal(timers.length, 1);
});

test("homepage uses one bounded in-content ad and one desktop-only calendar sidebar ad", async () => {
  const [app, home] = await Promise.all([
    read("../src/App.jsx"),
    read("../index.html"),
  ]);

  assert.ok(home.includes('data-schulferienklar-adsense="true"'));
  assert.equal(app.split("<SchulferienklarInContentAd />").length - 1, 1);
  assert.ok(app.includes("data-ad-slot={IN_CONTENT_AD_SLOT}"));
  assert.ok(app.includes('IN_CONTENT_AD_SLOT = "9291651091"'));
  assert.ok(app.includes('CALENDAR_SIDEBAR_AD_SLOT = "9134196439"'));
  assert.equal(app.split("data-ad-slot={IN_CONTENT_AD_SLOT}").length - 1, 1);
  assert.equal(app.split("data-ad-slot={CALENDAR_SIDEBAR_AD_SLOT}").length - 1, 1);
  assert.equal(app.split("<SchulferienklarCalendarSidebarAd />").length - 1, 1);
  assert.ok(app.includes('window.matchMedia("(min-width: 1160px)")'));
  assert.ok(app.includes("if (!isWideDesktop) return null;"));
  assert.ok(app.includes("if (!isWideDesktop) return;"));
  assert.ok(app.includes("desktopQuery.addEventListener"));
  assert.ok(app.includes("window.requestAnimationFrame"));
  assert.ok(app.includes("ad.isConnected"));
  assert.ok(app.includes('document.querySelectorAll("ins.adsbygoogle").length'));
  assert.ok(!app.includes("@media (max-width: 1159px)"));
  assert.ok(app.includes("width: 300px;"));
  assert.ok(app.includes("height: 250px;"));
  assert.ok(
    app.indexOf("<SchulferienklarCalendarSidebarAd />") > app.indexOf('<aside className="panel side-panel">') &&
    app.indexOf("<SchulferienklarCalendarSidebarAd />") < app.indexOf('id="reisezeit"'),
    "Second ad belongs below sidebar information, alongside the calendar",
  );
  assert.ok(app.includes("@media (min-width: 800px)"));
  assert.ok(app.includes("width: 728px; height: 90px"));
  assert.ok(app.includes("width: 320px;"));
  assert.ok(app.includes("height: 100px;"));
  assert.ok(app.includes('get("ads_debug") === "1"'));
  assert.ok(app.includes('data-ad-status="unfill-optimized"'));
  assert.ok(app.includes("new MutationObserver(reportStatus)"));
  assert.ok(app.includes("adDiagnostic ||"));
  assert.ok(app.includes("window.setTimeout(reportStatus, 6000)"));
  assert.equal(app.split("data-ad-slot={IN_CONTENT_AD_SLOT}").length - 1, 1);
  assert.ok(!app.includes("pagead2.googlesyndication.com"));
  assert.ok(!app.includes('data-ad-format="auto"'));
  assert.ok(!app.includes('data-full-width-responsive="true"'));
  assert.ok(
    app.indexOf("<SchulferienklarInContentAd />") > app.indexOf('id="reisezeit"') &&
    app.indexOf("<SchulferienklarInContentAd />") < app.indexOf('id="brueckentage"'),
    "Ad belongs after travel checker and before vacation planner",
  );
});

test("privacy and ad consent settings share a compact footer row", async () => {
  const [consent, css, mobileCss] = await Promise.all([
    read("../public/privacy-analytics.js"),
    read("../src/App.css"),
    read("../src/mobile-flow.css"),
  ]);
  assert.match(consent, /function getFooterSettingsContainer\(\)/);
  assert.match(consent, /className = "sf-footer-settings"/);
  assert.match(consent, /\.sf-footer-settings \{/);
  assert.match(css, /padding-bottom: 20px/);
  assert.match(mobileCss, /\.site-footer \{\s*padding-bottom: 32px;/);
  assert.match(mobileCss, /\.floating-site-menu-button\.is-footer-visible/);
  assert.match(await read("../src/App.jsx"), /new IntersectionObserver/);
});


test("static holiday and yearly-planner pages request one ad after useful content", async () => {
  const [seoGenerator, plannerGenerator, placement, stylesheet, legalPage] = await Promise.all([
    read("../scripts/generate-seo-pages.mjs"),
    read("../scripts/generate-urlaubsplaner-page.mjs"),
    read("../public/adsense-content.js"),
    read("../public/seo-pages.css"),
    read("../public/datenschutz.html"),
  ]);

  for (const generator of [seoGenerator, plannerGenerator]) {
    assert.match(generator, /<script defer src="\/adsense-content\.js"><\/script>/);
    assert.equal(generator.split('data-schulferienklar-adsense="true"').length - 1, 1);
  }
  assert.match(placement, /const SLOT = "9291651091"/);
  assert.match(placement, /mainCard\.querySelector\("#termine"\)/);
  assert.match(placement, /mainCard\.querySelector\("\.holiday-summary-list"\)/);
  assert.match(placement, /\.planner-page #beispiele/);
  assert.match(placement, /availableWidth < 300/);
  assert.match(placement, /width: 300, height: 50/);
  assert.match(placement, /anchor\.closest/);
  assert.match(placement, /document\.querySelector\("\.sf-content-ad"\)/);
  assert.match(placement, /window\.adsbygoogle/);
  assert.match(stylesheet, /data-ad-status="unfilled"/);
  assert.doesNotMatch(legalPage, /adsense-content\.js/);
});

test("mobile home does not mount a hidden desktop ad before the visible one", async () => {
  const app = await read("../src/App.jsx");
  const sidebar = app.slice(
    app.indexOf("function SchulferienklarCalendarSidebarAd() {"),
    app.indexOf("function getFreePeriodStatus(")
  );
  assert.ok(sidebar.includes('window.matchMedia("(min-width: 1160px)")'));
  assert.ok(sidebar.includes("if (!isWideDesktop) return null;"));
  assert.ok(sidebar.indexOf("if (!isWideDesktop) return null;") <
    sidebar.indexOf('<ins\n        ref={adRef}'), "Sidebar ad markup is conditionally omitted");
  assert.ok(!sidebar.includes('window.innerWidth < 1160'));
  assert.ok(!sidebar.includes("@media (max-width: 1159px)"));
  assert.ok(sidebar.includes("requestAnimationFrame"));
  assert.ok(app.indexOf("<SchulferienklarCalendarSidebarAd />") <
    app.indexOf("<SchulferienklarInContentAd />"),
    "Sidebar precedes in-content in DOM order, so it must not exist on mobile");
});


test("additional mobile ads mount lazily after finished tools without affecting desktop", async () => {
  const [app, home] = await Promise.all([
    read("../src/App.jsx"),
    read("../index.html"),
  ]);
  const mobileStart = app.indexOf("function SchulferienklarMobileExtraAd({ placement })");
  const mobileEnd = app.indexOf("function getFreePeriodStatus(", mobileStart);
  assert.ok(mobileStart > 0 && mobileEnd > mobileStart, "Mobile ad component exists");
  const mobile = app.slice(mobileStart, mobileEnd);

  assert.equal(app.split('<SchulferienklarMobileExtraAd placement=').length - 1, 2);
  assert.equal(app.split('<SchulferienklarMobileExtraAd placement="after-planner" />').length - 1, 1);
  assert.equal(app.split('<SchulferienklarMobileExtraAd placement="after-states" />').length - 1, 1);
  assert.ok(
    app.indexOf('<SchulferienklarMobileExtraAd placement="after-planner" />') >
      app.indexOf('id="brueckentage"') &&
    app.indexOf('<SchulferienklarMobileExtraAd placement="after-planner" />') <
      app.indexOf('id="vergleich"'),
    "First additional ad follows the planner, before the comparison controls",
  );
  assert.ok(
    app.indexOf('<SchulferienklarMobileExtraAd placement="after-states" />') >
      app.indexOf('id="bundeslaender"') &&
    app.indexOf('<SchulferienklarMobileExtraAd placement="after-states" />') <
      app.indexOf('className="panel widget-discovery"'),
    "Second additional ad follows the state list",
  );

  assert.match(mobile, /matchMedia\("\(min-width: 360px\) and \(max-width: 760px\)"\)/);
  assert.match(mobile, /if \(!isMobile\) return null;/);
  assert.match(mobile, /IntersectionObserver/);
  assert.match(mobile, /rootMargin: "500px 0px"/);
  assert.match(mobile, /\{isNearViewport && \(/);
  assert.match(mobile, /window\.requestAnimationFrame/);
  assert.match(mobile, /ad\.dataset\.schulferienklarRequested/);
  assert.match(mobile, /data-ad-slot=\{MOBILE_EXTRA_AD_SLOT\}/);
  assert.match(mobile, /data-ad-status="unfilled"/);
  assert.match(app, /MOBILE_EXTRA_AD_SLOT = IN_CONTENT_AD_SLOT/);
  assert.doesNotMatch(mobile, /pagead2\.googlesyndication\.com/);
  assert.equal(home.split('data-schulferienklar-adsense="true"').length - 1, 1);
});


test("editorial guides get exactly one nonintrusive ad, while legal, widget and print pages remain clear", async () => {
  const [guide, travel, checker, sources, privacy, impressum, support, about, widget, embeddedWidget, printCalendar, adCode, styles] =
    await Promise.all([
      read("../public/ferienplanung.html"),
      read("../public/travel-germany-school-holidays.html"),
      read("../public/germany-travel-checker.html"),
      read("../public/datenquellen.html"),
      read("../public/datenschutz.html"),
      read("../public/impressum.html"),
      read("../public/support.html"),
      read("../public/ueber-uns.html"),
      read("../public/widget.html"),
      read("../public/widgets/naechste-schulferien.html"),
      read("../public/downloads/jahreskalender-bayern-2027.html"),
      read("../public/adsense-content.js"),
      read("../public/static-pages.css"),
    ]);

  for (const page of [guide, travel, checker, sources]) {
    assert.equal(page.split('data-sf-ad-before').length - 1, 1);
    assert.equal(page.split('src="/adsense-content.js?v=20261102-guide-1"').length - 1, 1);
    assert.equal(page.split('data-schulferienklar-adsense="true"').length - 1, 1);
    assert.match(page, /src="\/privacy-analytics\.js"/);
  }
  assert.match(sources, /<h2 id="feiertage" data-sf-ad-before>/);
  for (const page of [privacy, impressum, support, about, widget, embeddedWidget, printCalendar]) {
    assert.doesNotMatch(page, /src="\/adsense-content\.js"/);
    assert.doesNotMatch(page, /pagead2\.googlesyndication\.com/);
  }
  assert.match(adCode, /document\.body\.classList\.contains\("static-page"\)/);
  assert.match(adCode, /data-sf-ad-before/);
  assert.match(adCode, /"beforebegin" : "afterend"/);
  assert.match(styles, /data-ad-status="unfilled"/);
  assert.match(styles, /data-ad-status="unfill-optimized"/);
});

test("second ad on longer holiday pages waits for both scroll proximity and first ad completion", async () => {
  const [script, goldExample, plannerExample, css] = await Promise.all([
    read("../public/adsense-content.js"),
    read("../public/schulferien-bayern-2027.html"),
    read("../public/urlaubsplaner-2027.html"),
    read("../public/seo-pages.css"),
  ]);

  assert.match(goldExample, /data-gold-page="bayern-2027"/);
  assert.match(goldExample, /id="berechnung"/);
  assert.match(plannerExample, /id="bundeslaender"/);
  assert.match(script, /main > \.card\[data-gold-page\] #berechnung/);
  assert.match(script, /\.planner-page #bundeslaender/);
  assert.match(script, /function setupLongPageAd\(firstUnit\)/);
  assert.match(script, /firstUnit\.getAttribute\("data-adsbygoogle-status"\) !== "done"/);
  assert.match(script, /new IntersectionObserver/);
  assert.match(script, /new MutationObserver/);
  assert.match(script, /rootMargin: "350px 0px"/);
  assert.match(script, /window\.requestAnimationFrame/);
  assert.match(script, /sentinel\.replaceWith\(wrapper\)/);
  assert.match(css, /data-ad-status="unfill-optimized"/);
});


test("editorial ad requests are laid out before submit and reveal opt-in status", async () => {
  const [source, staticCss, seoCss] = await Promise.all([
    read("../public/adsense-content.js"),
    read("../public/static-pages.css"),
    read("../public/seo-pages.css"),
  ]);
  assert.match(source, /new URLSearchParams\(window\.location\.search\)/);
  assert.match(source, /get\("ads_debug"\) === "1"/);
  assert.match(source, /wrapper\.classList\.add\("sf-content-ad-debug"\)/);
  assert.match(source, /data-adsbygoogle-status/);
  assert.match(source, /data-ad-status/);
  assert.match(source, /Loader: /);
  assert.match(source, /Request: /);
  assert.match(source, /window\.requestAnimationFrame\(request\)/);
  assert.match(source, /availableWidth < 300 && !isEditorial/);
  assert.match(source, /width: 250, height: 250/);
  assert.match(source, /availableWidth < 250 && isEditorial/);
  assert.match(source, /document\.body\.classList\.contains\("static-page"\)/);
  assert.match(staticCss, /\.sf-ad-diagnostic/);
  assert.match(staticCss, /:not\(\.sf-content-ad-debug\)/);
  assert.match(seoCss, /:not\(\.sf-content-ad-debug\)/);
});
