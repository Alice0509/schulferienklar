import fs from "node:fs";
import path from "node:path";

import {
  STATES,
  YEARS,
} from "./lib/site-config.mjs";

const publicDir = path.join(process.cwd(), "public");
const sitemapPath = path.join(publicDir, "sitemap.xml");
const plannerYears = YEARS;

const requiredFiles = [
  "sitemap.xml",
  "seo-pages.css",
  "urlaubsplaner.css",
  "widget.html",
  "widget-demo.js",
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
    [
      "related planning tools",
      /class="planner-section planner-related-tools"/,
    ],
    [
      "Germany Travel Checker referral",
      new RegExp(
        `germanytravelchecker\\.com/\\?utm_source=schulferienklar&amp;utm_medium=referral&amp;utm_campaign=urlaubsplaner-${year}`,
      ),
    ],
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

  const plannerYearLinks =
    plannerHtml.match(
      /class="planner-year-link(?: is-current)?" href="\/urlaubsplaner-20(?:26|27|28|29|30)\.html"/g,
    ) || [];

  if (plannerYearLinks.length !== plannerYears.length) {
    errors.push(
      `${plannerFile}: expected links for all planner years`,
    );
  }

  const currentPlannerYearLink = new RegExp(
    `class="planner-year-link is-current" href="/urlaubsplaner-${year}\\.html" aria-current="page"`,
  );

  if (!currentPlannerYearLink.test(plannerHtml)) {
    errors.push(
      `${plannerFile}: missing current planner year marker`,
    );
  }
}


for (const [
  slug,
  name,
  ,
  code,
] of STATES) {
  for (const year of YEARS) {
    const file =
      `schulferien-${slug}-${year}.html`;

    const filePath = path.join(
      publicDir,
      file,
    );

    if (!fs.existsSync(filePath)) {
      errors.push(
        `${file}: missing state-year SEO page`,
      );
      continue;
    }

    const html = fs.readFileSync(
      filePath,
      "utf8",
    );

    const normalizedCode =
      code.toLowerCase();

    const checks = [
      [
        "Jahreskalender section",
        'id="jahreskalender"',
      ],
      [
        "Jahreskalender heading",
        `Jahreskalender ${name} ${year}`,
      ],
      [
        "Jahreskalender preview link",
        `/downloads/jahreskalender-${slug}-${year}.html`,
      ],
      [
        "PDF download link",
        `/downloads/schulferien-${slug}-${year}.pdf`,
      ],
      [
        "yearly ICS download link",
        `/downloads/schulferien-${slug}-${year}.ics`,
      ],
      [
        "subscription link",
        `webcal://www.schulferienklar.de/calendar/${normalizedCode}.ics`,
      ],
      [
        "PDF button label",
        "PDF herunterladen",
      ],
      [
        "ICS button label",
        "ICS-Datei herunterladen",
      ],
      [
        "subscription button label",
        "Kalender abonnieren",
      ],
      [
        "Widget CTA",
        `/widget.html?state=${code}`,
      ],
      [
        "Widget heading",
        `Schulferien-Widget für ${name}`,
      ],
    ];

    for (const [label, value] of checks) {
      if (!html.includes(value)) {
        errors.push(
          `${file}: missing ${label}`,
        );
      }
    }
  }
}



const widgetPagePath = path.join(
  publicDir,
  "widget.html",
);

if (fs.existsSync(widgetPagePath)) {
  const widgetHtml = fs.readFileSync(
    widgetPagePath,
    "utf8",
  );

  if (
    !widgetHtml.includes(
      'data-analytics-action="copy-widget-code"',
    )
  ) {
    errors.push(
      "widget.html: missing consent-based copy tracking action",
    );
  }

  if (
    !widgetHtml.includes(
      'data-analytics-action="register-widget-website"',
    )
  ) {
    errors.push(
      "widget.html: missing website registration action",
    );
  }

  if (
    widgetHtml.includes(
      'data-analytics-action="request-widget-customization"',
    )
  ) {
    errors.push(
      "widget.html: unexpected commercial customization enquiry action",
    );
  }

  if (
    !widgetHtml.includes(
      'src="/privacy-analytics.js"',
    )
  ) {
    errors.push(
      "widget.html: missing privacy analytics script",
    );
  }
}

if (fs.existsSync(sitemapPath)) {
  const sitemap = fs.readFileSync(
    sitemapPath,
    "utf8",
  );

  if (
    !sitemap.includes(
      "https://www.schulferienklar.de/widget.html",
    )
  ) {
    errors.push(
      "sitemap.xml: missing widget.html URL",
    );
  }
}


const commonGoldPageChecks = [
  [
    "direct answer section",
    /id="termine"/,
  ],
  [
    "connected free-time explanation",
    /Zusammenhängend frei/,
  ],
  [
    "FAQ structured data",
    /FAQPage/,
  ],
  [
    "breadcrumb structured data",
    /BreadcrumbList/,
  ],
  [
    "visible FAQ section",
    /id="fragen"/,
  ],
  [
    "Jahreskalender section",
    /id="jahreskalender"/,
  ],
];

const goldPageValidations = [
  {
    file:
      "schulferien-sachsen-anhalt-2027.html",
    checks: [
      [
        "Gold Page marker",
        /data-gold-page="sachsen-anhalt-2027"/,
      ],
      ...commonGoldPageChecks,
      [
        "Winterferien",
        /Winterferien/,
      ],
      [
        "Osterferien",
        /Osterferien/,
      ],
      [
        "Easter connected period",
        /20\. bis[\s\S]*29\. März 2027/,
      ],
      [
        "Pfingstferien",
        /Pfingstferien/,
      ],
      [
        "movable holiday explanation",
        /Bewegliche Ferientage/,
      ],
      [
        "movable holiday limitation",
        /nicht landesweit festgelegt/,
      ],
      [
        "Epiphany",
        /Heilige Drei Könige/,
      ],
      [
        "Epiphany date",
        /6\. Januar 2027/,
      ],
      [
        "official Sachsen-Anhalt source",
        /Ministerium für Bildung des Landes Sachsen-Anhalt/,
      ],
      [
        "official source link",
        /mb\.sachsen-anhalt\.de/,
      ],
      [
        "Jahreskalender preview link",
        /downloads\/jahreskalender-sachsen-anhalt-2027\.html/,
      ],
      [
        "Jahreskalender PDF link",
        /downloads\/schulferien-sachsen-anhalt-2027\.pdf/,
      ],
      [
        "Jahreskalender ICS link",
        /downloads\/schulferien-sachsen-anhalt-2027\.ics/,
      ],
    ],
  },
  {
    file:
      "schulferien-thueringen-2027.html",
    checks: [
      [
        "Gold Page marker",
        /data-gold-page="thueringen-2027"/,
      ],
      ...commonGoldPageChecks,
      [
        "Winterferien",
        /Winterferien/,
      ],
      [
        "school-free day",
        /Schulfreier Tag/,
      ],
      [
        "school-free date",
        /7\. Mai 2027/,
      ],
      [
        "Ascension connected period",
        /6\. bis[\s\S]*9\. Mai 2027/,
      ],
      [
        "free-disposition holiday explanation",
        /Ferientage zur freien Verfügung/,
      ],
      [
        "school conference limitation",
        /Schulkonferenz/,
      ],
      [
        "World Children's Day",
        /Weltkindertag/,
      ],
      [
        "World Children's Day date",
        /20\. September 2027/,
      ],
      [
        "regional Corpus Christi",
        /Fronleichnam/,
      ],
      [
        "Corpus Christi limitation",
        /nur in bestimmten Regionen/,
      ],
      [
        "official Thüringen source",
        /Thüringer Ministerium für Bildung, Wissenschaft und Kultur/,
      ],
      [
        "official Thüringen source link",
        /bildung\.thueringen\.de/,
      ],
      [
        "Jahreskalender preview link",
        /downloads\/jahreskalender-thueringen-2027\.html/,
      ],
      [
        "Jahreskalender PDF link",
        /downloads\/schulferien-thueringen-2027\.pdf/,
      ],
      [
        "Jahreskalender ICS link",
        /downloads\/schulferien-thueringen-2027\.ics/,
      ],
    ],
  },
  {
    file:
      "schulferien-sachsen-2027.html",
    checks: [
      [
        "Gold Page marker",
        /data-gold-page="sachsen-2027"/,
      ],
      ...commonGoldPageChecks,
      [
        "Winterferien",
        /Winterferien/,
      ],
      [
        "school-free day",
        /Unterrichtsfreier Tag/,
      ],
      [
        "school-free date",
        /7\. Mai 2027/,
      ],
      [
        "Ascension connected period",
        /6\. bis[\s\S]*9\. Mai 2027/,
      ],
      [
        "Pentecost holidays",
        /Pfingstferien/,
      ],
      [
        "movable holiday explanation",
        /frei beweglichen Ferientag/i,
      ],
      [
        "regional Corpus Christi",
        /Fronleichnam/,
      ],
      [
        "Corpus Christi limitation",
        /nur in bestimmten Regionen/,
      ],
      [
        "Repentance Day",
        /Buß- und Bettag/,
      ],
      [
        "official Sachsen source",
        /Sächsisches Staatsministerium für Kultus/,
      ],
      [
        "official Sachsen source link",
        /schule\.sachsen\.de/,
      ],
      [
        "Jahreskalender preview link",
        /downloads\/jahreskalender-sachsen-2027\.html/,
      ],
      [
        "Jahreskalender PDF link",
        /downloads\/schulferien-sachsen-2027\.pdf/,
      ],
      [
        "Jahreskalender ICS link",
        /downloads\/schulferien-sachsen-2027\.ics/,
      ],
    ],
  },
  {
    file:
      "schulferien-berlin-2027.html",
    checks: [
      [
        "Gold Page marker",
        /data-gold-page="berlin-2027"/,
      ],
      ...commonGoldPageChecks,
      [
        "Winterferien terminology",
        /Winterferien/,
      ],
      [
        "AZVO school-free day",
        /Unterrichtsfreier Tag nach AZVO/,
      ],
      [
        "AZVO date",
        /7\. Mai 2027/,
      ],
      [
        "Ascension connected period",
        /6\. bis[\s\S]*9\. Mai 2027/,
      ],
      [
        "Pentecost holidays",
        /Pfingstferien/,
      ],
      [
        "Pentecost dates",
        /18\. und 19\. Mai 2027/,
      ],
      [
        "Pentecost connected period",
        /15\. bis[\s\S]*19\. Mai 2027/,
      ],
      [
        "International Women's Day",
        /Internationale(?:r)? Frauentag/,
      ],
      [
        "Women's Day date",
        /8\. März 2027/,
      ],
      [
        "special school exception",
        /John-F\.-Kennedy-Schule/,
      ],
      [
        "religious exemption limitation",
        /religiöse Unterrichtsbefreiungen/,
      ],
      [
        "official Berlin source",
        /Senatsverwaltung für Bildung, Jugend und Familie Berlin/,
      ],
      [
        "official Berlin source link",
        /berlin\.de/,
      ],
      [
        "Jahreskalender preview link",
        /downloads\/jahreskalender-berlin-2027\.html/,
      ],
      [
        "Jahreskalender PDF link",
        /downloads\/schulferien-berlin-2027\.pdf/,
      ],
      [
        "Jahreskalender ICS link",
        /downloads\/schulferien-berlin-2027\.ics/,
      ],
    ],
  },
  {
    file:
      "schulferien-bayern-2027.html",
    checks: [
      [
        "Gold Page marker",
        /data-gold-page="bayern-2027"/,
      ],
      ...commonGoldPageChecks,
      [
        "Faschingsferien terminology",
        /Faschingsferien/,
      ],
      [
        "Allerheiligen terminology",
        /unterrichtsfreie Tage um Allerheiligen/,
      ],
      [
        "official Bayern source",
        /Bayerisches Staatsministerium/,
      ],
      [
        "Bayern.Recht source link",
        /gesetze-bayern\.de/,
      ],
      [
        "Jahreskalender preview link",
        /downloads\/jahreskalender-bayern-2027\.html/,
      ],
      [
        "Jahreskalender PDF link",
        /downloads\/schulferien-bayern-2027\.pdf/,
      ],
      [
        "Jahreskalender ICS link",
        /downloads\/schulferien-bayern-2027\.ics/,
      ],
    ],
  },
  {
    file:
      "schulferien-niedersachsen-2027.html",
    checks: [
      [
        "Gold Page marker",
        /data-gold-page="ni-2027"/,
      ],
      ...commonGoldPageChecks,
      [
        "Halbjahresferien terminology",
        /Halbjahresferien/,
      ],
      [
        "Ascension school-free day",
        /Tag nach Himmelfahrt/,
      ],
      [
        "Ascension school-free date",
        /7\. Mai 2027/,
      ],
      [
        "Ascension connected period",
        /6\. bis[\s\S]*9\. Mai 2027/,
      ],
      [
        "Pentecost date",
        /18\. Mai 2027/,
      ],
      [
        "Pentecost connected period",
        /15\. bis[\s\S]*18\. Mai 2027/,
      ],
      [
        "school exception explanation",
        /Ostfriesischen Inseln/,
      ],
      [
        "official Niedersachsen source",
        /Niedersächsisches Kultusministerium/,
      ],
      [
        "official Niedersachsen source link",
        /mk\.niedersachsen\.de/,
      ],
      [
        "Jahreskalender preview link",
        /downloads\/jahreskalender-niedersachsen-2027\.html/,
      ],
      [
        "Jahreskalender PDF link",
        /downloads\/schulferien-niedersachsen-2027\.pdf/,
      ],
      [
        "Jahreskalender ICS link",
        /downloads\/schulferien-niedersachsen-2027\.ics/,
      ],
    ],
  },
  {
    file:
      "schulferien-nordrhein-westfalen-2027.html",
    checks: [
      [
        "Gold Page marker",
        /data-gold-page="nrw-2027"/,
      ],
      ...commonGoldPageChecks,
      [
        "movable holiday explanation",
        /bewegliche Ferientage/i,
      ],
      [
        "Rosenmontag limitation",
        /Rosenmontag ist kein landesweit einheitlicher Ferientermin/,
      ],
      [
        "Pfingsten terminology",
        /Pfingsten 2027/,
      ],
      [
        "official NRW ministry source",
        /Ministerium für Schule und Bildung/,
      ],
      [
        "official NRW source link",
        /schulministerium\.nrw/,
      ],
      [
        "Jahreskalender preview link",
        /downloads\/jahreskalender-nordrhein-westfalen-2027\.html/,
      ],
      [
        "Jahreskalender PDF link",
        /downloads\/schulferien-nordrhein-westfalen-2027\.pdf/,
      ],
      [
        "Jahreskalender ICS link",
        /downloads\/schulferien-nordrhein-westfalen-2027\.ics/,
      ],
    ],
  },
  {
    file:
      "schulferien-baden-wuerttemberg-2027.html",
    checks: [
      [
        "Gold Page marker",
        /data-gold-page="bw-2027"/,
      ],
      ...commonGoldPageChecks,
      [
        "Maundy Thursday school-free date",
        /25\. März 2027/,
      ],
      [
        "Maundy Thursday terminology",
        /Gründonnerstag/,
      ],
      [
        "connected Easter period",
        /25\. März bis 4\. April 2027/,
      ],
      [
        "Pentecost holidays",
        /Pfingstferien/,
      ],
      [
        "movable holiday limitation",
        /Bewegliche Ferientage/,
      ],
      [
        "school-free Saturdays limitation",
        /unterrichtsfreie Samstage/,
      ],
      [
        "official ministry source",
        /Ministerium für Kultus, Jugend und Sport/,
      ],
      [
        "official ministry source link",
        /km\.baden-wuerttemberg\.de/,
      ],
      [
        "Jahreskalender preview link",
        /downloads\/jahreskalender-baden-wuerttemberg-2027\.html/,
      ],
      [
        "Jahreskalender PDF link",
        /downloads\/schulferien-baden-wuerttemberg-2027\.pdf/,
      ],
      [
        "Jahreskalender ICS link",
        /downloads\/schulferien-baden-wuerttemberg-2027\.ics/,
      ],
    ],
  },
];

for (
  const {
    file,
    checks,
  } of goldPageValidations
) {
  const fullPath =
    path.join(
      publicDir,
      file,
    );

  if (!fs.existsSync(fullPath)) {
    continue;
  }

  const html =
    fs.readFileSync(
      fullPath,
      "utf8",
    );

  for (
    const [label, pattern]
    of checks
  ) {
    if (!pattern.test(html)) {
      errors.push(
        `${file}: missing ${label}`,
      );
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
