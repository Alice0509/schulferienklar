import fs from "node:fs";
import path from "node:path";

const publicDir = path.join(process.cwd(), "public");
const sitemapPath = path.join(publicDir, "sitemap.xml");
const plannerYears = [2026, 2027, 2028, 2029, 2030];

const requiredFiles = [
  "sitemap.xml",
  "seo-pages.css",
  "urlaubsplaner.css",
  ...plannerYears.map((year) => `urlaubsplaner-${year}.html`),
  "schulferien-2026.html",
  "schulferien-bayern.html",
  "schulferien-bayern-2026.html",
  "schulferien-bayern-2027.html",
  "jahreskalender.css",
  "downloads/jahreskalender-bayern-2027.html",
  "downloads/schulferien-bayern-2027.ics",
];

const htmlFiles = fs
  .readdirSync(publicDir)
  .filter((file) => file.endsWith(".html"))
  .filter((file) => {
    return (
      file.startsWith("schulferien-") ||
      file.startsWith("urlaubsplaner-")
    );
  });

const errors = [];

for (const file of requiredFiles) {
  const fullPath = path.join(publicDir, file);
  if (!fs.existsSync(fullPath)) {
    errors.push(`Missing required file: ${file}`);
  }
}

if (!fs.existsSync(sitemapPath)) {
  errors.push("Missing sitemap.xml");
} else {
  const sitemap = fs.readFileSync(sitemapPath, "utf8");

  for (const file of htmlFiles) {
    const expectedUrl = `https://www.schulferienklar.de/${file}`;
    if (!sitemap.includes(expectedUrl)) {
      errors.push(`Missing sitemap URL: ${expectedUrl}`);
    }
  }
}

for (const file of htmlFiles) {
  const fullPath = path.join(publicDir, file);
  const html = fs.readFileSync(fullPath, "utf8");

  const checks = [
    ["title", /<title>.+<\/title>/s],
    ["meta description", /<meta name="description" content="[^"]+"/],
    [
      "canonical",
      /<link\b(?=[^>]*\brel="canonical")(?=[^>]*\bhref="https:\/\/www\.schulferienklar\.de\/[^"]+")[^>]*>/,
    ],
    ["shared stylesheet", /<link rel="stylesheet" href="\/seo-pages\.css" \/>/],
    ["h1", /<h1>.+<\/h1>/s],
  ];

  for (const [label, pattern] of checks) {
    if (!pattern.test(html)) {
      errors.push(`${file}: missing ${label}`);
    }
  }
}


const schoolHolidayHtmlFiles = htmlFiles.filter((file) => {
  return file.startsWith("schulferien-");
});

for (const file of schoolHolidayHtmlFiles) {
  const html = fs.readFileSync(
    path.join(publicDir, file),
    "utf8",
  );

  if (!html.includes('class="intro-card intro-card-visual"')) {
    errors.push(`${file}: missing calendar promo card`);
  }

  if (!html.includes('class="intro-card-image-link"')) {
    errors.push(`${file}: missing calendar promo image link`);
  }

  if (!html.includes('class="intro-card-link"')) {
    errors.push(`${file}: missing calendar promo CTA`);
  }
}


for (const year of plannerYears) {
  const plannerFile = `urlaubsplaner-${year}.html`;
  const plannerPath = path.join(
    publicDir,
    plannerFile,
  );

  if (!fs.existsSync(plannerPath)) {
    continue;
  }

  const plannerHtml = fs.readFileSync(
    plannerPath,
    "utf8",
  );

  const plannerChecks = [
    [
      "planner page marker",
      new RegExp(`data-page="urlaubsplaner-${year}"`),
    ],
    ["planner stylesheet", /href="\/urlaubsplaner\.css"/],
    [
      "planner canonical",
      new RegExp(
        `canonical[^>]+urlaubsplaner-${year}\\.html`,
      ),
    ],
    [
      "calculator anchor",
      new RegExp(
        `year=${year}&vacationDays=[1-5]#brueckentage`,
      ),
    ],
    ["budget 1 example", /data-budget="1"/],
    ["budget 5 example", /data-budget="5"/],
    ["scope limitation", /lokale Feiertage/i],
    ["FAQ structured data", /FAQPage/],
    ["breadcrumb structured data", /BreadcrumbList/],
  ];

  for (const [label, pattern] of plannerChecks) {
    if (!pattern.test(plannerHtml)) {
      errors.push(`${plannerFile}: missing ${label}`);
    }
  }

  const statePlannerLinks =
    plannerHtml.match(
      new RegExp(
        `/\\?state=[A-Z]{2}&year=${year}&vacationDays=4#brueckentage`,
        "g",
      ),
    ) || [];

  const uniqueStatePlannerLinks =
    new Set(statePlannerLinks);

  if (uniqueStatePlannerLinks.size < 16) {
    errors.push(
      `${plannerFile}: expected planner links for 16 states`,
    );
  }
}


const bayern2027Path = path.join(
  publicDir,
  "schulferien-bayern-2027.html"
);

if (fs.existsSync(bayern2027Path)) {
  const bayern2027Html = fs.readFileSync(bayern2027Path, "utf8");
  const goldPageChecks = [
    ["Gold Page marker", /data-gold-page="bayern-2027"/],
    ["direct answer section", /id="termine"/],
    ["connected free-time explanation", /Zusammenhängend frei/],
    ["Faschingsferien terminology", /Faschingsferien/],
    ["Allerheiligen terminology", /unterrichtsfreie Tage um Allerheiligen/],
    ["official Bayern source", /Bayerisches Staatsministerium/],
    ["Bayern.Recht source link", /gesetze-bayern\.de/],
    ["FAQ structured data", /FAQPage/],
    ["breadcrumb structured data", /BreadcrumbList/],
    ["visible FAQ section", /id="fragen"/],
    ["Jahreskalender section", /id="jahreskalender"/],
    ["Jahreskalender preview link", /downloads\/jahreskalender-bayern-2027\.html/],
    ["Jahreskalender ICS link", /downloads\/schulferien-bayern-2027\.ics/],
  ];

  for (const [label, pattern] of goldPageChecks) {
    if (!pattern.test(bayern2027Html)) {
      errors.push(`schulferien-bayern-2027.html: missing ${label}`);
    }
  }
}


const bayern2027CalendarPath = path.join(
  publicDir,
  "downloads",
  "jahreskalender-bayern-2027.html"
);
const bayern2027IcsPath = path.join(
  publicDir,
  "downloads",
  "schulferien-bayern-2027.ics"
);

if (fs.existsSync(bayern2027CalendarPath)) {
  const calendarHtml = fs.readFileSync(bayern2027CalendarPath, "utf8");
  const calendarChecks = [
    ["noindex directive", /name="robots" content="noindex,follow"/],
    ["Gold Page canonical", /canonical[^>]+schulferien-bayern-2027\.html/],
    ["January month", />Januar<\/h2>/],
    ["December month", />Dezember<\/h2>/],
    ["calendar weeks", /class="week-number"/],
    ["holiday legend", /Schulferien<\/span>/],
    ["public holiday legend", /Gesetzlicher Feiertag<\/span>/],
    ["connected free legend", /Zusammenhängend frei<\/span>/],
    ["print action", /window\.print\(\)/],
    ["privacy analytics script", /privacy-analytics\.js/],
    ["print tracking", /data-download-action="print-pdf-bayern-2027"/],
    ["ICS tracking", /data-download-action="download-ics-bayern-2027"/],
    ["official source", /Bayerisches Staatsministerium/],
  ];

  for (const [label, pattern] of calendarChecks) {
    if (!pattern.test(calendarHtml)) {
      errors.push(`downloads/jahreskalender-bayern-2027.html: missing ${label}`);
    }
  }
}

if (fs.existsSync(bayern2027IcsPath)) {
  const ics = fs.readFileSync(bayern2027IcsPath, "utf8");
  const unfoldedIcs = ics.replace(/\r?\n[ \t]/g, "");
  const icsChecks = [
    ["VCALENDAR start", /BEGIN:VCALENDAR/],
    ["VCALENDAR end", /END:VCALENDAR/],
    ["Frühjahrsferien event", /Frühjahrsferien/],
    ["Sommerferien event", /Sommerferien/],
    ["public holiday event", /\(Feiertag\)/],
    ["exclusive DTEND", /DTEND;VALUE=DATE:/],
  ];

  for (const [label, pattern] of icsChecks) {
    if (!pattern.test(unfoldedIcs)) {
      errors.push(`downloads/schulferien-bayern-2027.ics: missing ${label}`);
    }
  }
}

console.log(`Checked ${htmlFiles.length} generated SEO HTML files.`);

if (errors.length > 0) {
  console.error("\nGenerated SEO validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("✅ Generated SEO validation passed.");
