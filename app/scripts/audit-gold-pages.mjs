import fs from "node:fs";
import path from "node:path";

import {
  STATES,
} from "./lib/site-config.mjs";

const YEAR = Number(process.argv[2]);

if (
  !Number.isInteger(YEAR) ||
  YEAR < 2000 ||
  YEAR > 2100
) {
  console.error(
    "Usage: node scripts/audit-gold-pages.mjs <year>",
  );
  process.exit(2);
}

const SITE_ORIGIN =
  "https://www.schulferienklar.de";

const GOLD_MARKER_BASE_BY_CODE =
  Object.freeze({
    BW: "bw",
    NI: "ni",
    NW: "nrw",
  });
const publicDir = path.resolve("public");
const holidayDataDir = path.join(
  publicDir,
  "data",
  "holidays",
);

const failures = [];
const warnings = [];
const records = [];

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function readFile(filePath) {
  return fs.readFileSync(
    filePath,
    "utf8",
  );
}

function stripTags(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatDate(dateKey) {
  const [
    year,
    month,
    day,
  ] = String(dateKey).split("-");

  return `${day}.${month}.${year}`;
}

function extract(html, pattern) {
  return (
    html.match(pattern)?.[1]?.trim() ||
    null
  );
}

function countMatches(
  html,
  pattern,
) {
  return [
    ...html.matchAll(pattern),
  ].length;
}

function addDuplicateCheck(
  map,
  value,
  label,
  file,
) {
  if (!value) {
    return;
  }

  const existing = map.get(value);

  if (existing) {
    fail(
      `${label} duplicate: ${file} ↔ ${existing}`,
    );
    return;
  }

  map.set(
    value,
    file,
  );
}

function loadDatasets() {
  const map = new Map();

  for (
    const filename
    of fs.readdirSync(
      holidayDataDir,
    )
  ) {
    if (
      !filename.endsWith(".json")
    ) {
      continue;
    }

    const filePath = path.join(
      holidayDataDir,
      filename,
    );

    let data;

    try {
      data = JSON.parse(
        readFile(filePath),
      );
    } catch {
      continue;
    }

    const holidays =
      data.holidays ||
      data.events;

    if (
      !Array.isArray(holidays) ||
      holidays.length === 0
    ) {
      continue;
    }

    const code =
      data.sources?.[0]
        ?.bundeslandCode ||
      holidays[0]
        ?.bundeslandCode;

    if (!code) {
      continue;
    }

    map.set(
      code,
      data,
    );
  }

  return map;
}

function getEventsForYear(
  dataset,
) {
  const start =
    `${YEAR}-01-01`;
  const end =
    `${YEAR}-12-31`;

  return (
    dataset.holidays ||
    dataset.events ||
    []
  )
    .filter((event) => {
      return (
        event.startDate <= end &&
        event.endDate >= start
      );
    })
    .sort((a, b) => {
      return a.startDate.localeCompare(
        b.startDate,
      );
    });
}

function getSchemaTypes(html) {
  const types =
    new Set();

  const blocks = [
    ...html.matchAll(
      /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi,
    ),
  ];

  for (const match of blocks) {
    let data;

    try {
      data = JSON.parse(
        match[1],
      );
    } catch {
      fail(
        "Invalid JSON-LD block",
      );
      continue;
    }

    const nodes =
      Array.isArray(data["@graph"])
        ? data["@graph"]
        : [data];

    for (
      const node of nodes
    ) {
      const type =
        node?.["@type"];

      if (Array.isArray(type)) {
        for (
          const item of type
        ) {
          types.add(item);
        }
      } else if (type) {
        types.add(type);
      }
    }
  }

  return types;
}

function auditInternalPaths(
  html,
  pageFile,
) {
  const refs = [
    ...html.matchAll(
      /(?:href|src)="([^"]+)"/g,
    ),
  ].map(
    (match) => match[1],
  );

  const seen = new Set();

  for (const ref of refs) {
    if (
      !ref.startsWith("/")
    ) {
      continue;
    }

    const pathname =
      ref.split(/[?#]/)[0];

    if (
      !pathname ||
      pathname === "/" ||
      seen.has(pathname)
    ) {
      continue;
    }

    seen.add(pathname);

    const target = path.join(
      publicDir,
      pathname.slice(1),
    );

    if (
      !fs.existsSync(target)
    ) {
      fail(
        `${pageFile}: broken local path ${pathname}`,
      );
    }
  }
}

const datasets =
  loadDatasets();

const sitemapPath =
  path.join(
    publicDir,
    "sitemap.xml",
  );

if (
  !fs.existsSync(
    sitemapPath,
  )
) {
  fail(
    "public/sitemap.xml is missing",
  );
}

const sitemap =
  fs.existsSync(
    sitemapPath,
  )
    ? readFile(sitemapPath)
    : "";

const titles =
  new Map();
const descriptions =
  new Map();
const canonicals =
  new Map();

for (
  const [
    slug,
    name,
    ,
    code,
  ]
  of STATES
) {
  const pageFile =
    `schulferien-${slug}-${YEAR}.html`;

  const filePath =
    path.join(
      publicDir,
      pageFile,
    );

  if (
    !fs.existsSync(filePath)
  ) {
    fail(
      `${code}: missing ${pageFile}`,
    );
    continue;
  }

  const html =
    readFile(filePath);

  const markerBase =
    GOLD_MARKER_BASE_BY_CODE[code] ||
    slug;

  const marker =
    `${markerBase}-${YEAR}`;

  const expectedCanonical =
    `${SITE_ORIGIN}/${pageFile}`;

  const title =
    stripTags(
      extract(
        html,
        /<title>([\s\S]*?)<\/title>/i,
      ),
    );

  const description =
    extract(
      html,
      /<meta\s+name="description"\s+content="([^"]*)"\s*\/?>/i,
    );

  const canonical =
    extract(
      html,
      /<link\s+rel="canonical"\s+href="([^"]*)"\s*\/?>/i,
    );

  const ogTitle =
    extract(
      html,
      /<meta\s+property="og:title"\s+content="([^"]*)"\s*\/?>/i,
    );

  const ogDescription =
    extract(
      html,
      /<meta\s+property="og:description"\s+content="([^"]*)"\s*\/?>/i,
    );

  const ogUrl =
    extract(
      html,
      /<meta\s+property="og:url"\s+content="([^"]*)"\s*\/?>/i,
    );

  const h1Count =
    countMatches(
      html,
      /<h1\b[^>]*>[\s\S]*?<\/h1>/gi,
    );

  const schemaTypes =
    getSchemaTypes(html);

  if (
    !html.includes(
      `data-gold-page="${marker}"`,
    )
  ) {
    fail(
      `${code}: Gold Page marker missing`,
    );
  }

  if (
    !html.includes(
      '<html lang="de">',
    )
  ) {
    fail(
      `${code}: html lang=de missing`,
    );
  }

  if (
    !html.includes(
      'name="viewport"',
    )
  ) {
    fail(
      `${code}: viewport meta missing`,
    );
  }

  if (
    /noindex/i.test(html)
  ) {
    fail(
      `${code}: noindex found`,
    );
  }

  if (!title) {
    fail(
      `${code}: title missing`,
    );
  }

  if (!description) {
    fail(
      `${code}: meta description missing`,
    );
  }

  if (
    canonical !==
    expectedCanonical
  ) {
    fail(
      `${code}: canonical mismatch: ${canonical}`,
    );
  }

  if (
    ogUrl !==
    expectedCanonical
  ) {
    fail(
      `${code}: og:url mismatch`,
    );
  }

  if (
    title &&
    ogTitle !== title
  ) {
    fail(
      `${code}: og:title differs from title`,
    );
  }

  if (
    description &&
    ogDescription !==
      description
  ) {
    fail(
      `${code}: og:description differs from description`,
    );
  }

  if (
    h1Count !== 1
  ) {
    fail(
      `${code}: expected 1 h1, found ${h1Count}`,
    );
  }

  for (
    const sectionId
    of [
      "termine",
      "berechnung",
      "jahreskalender",
      "widget",
      "quelle",
      "fragen",
    ]
  ) {
    if (
      !html.includes(
        `id="${sectionId}"`,
      )
    ) {
      fail(
        `${code}: #${sectionId} missing`,
      );
    }
  }

  if (
    !schemaTypes.has(
      "BreadcrumbList",
    )
  ) {
    fail(
      `${code}: BreadcrumbList missing`,
    );
  }

  if (
    !schemaTypes.has(
      "FAQPage",
    )
  ) {
    fail(
      `${code}: FAQPage missing`,
    );
  }

  const faqQuestionCount =
    countMatches(
      html,
      /"@type":"Question"/g,
    );

  if (
    faqQuestionCount < 5
  ) {
    fail(
      `${code}: only ${faqQuestionCount} FAQ questions`,
    );
  }

  const expectedLinks = [
    `/downloads/jahreskalender-${slug}-${YEAR}.html`,
    `/downloads/schulferien-${slug}-${YEAR}.pdf`,
    `/downloads/schulferien-${slug}-${YEAR}.ics`,
  ];

  for (
    const href
    of expectedLinks
  ) {
    if (
      !html.includes(
        `href="${href}"`,
      )
    ) {
      fail(
        `${code}: link missing ${href}`,
      );
    }

    const target =
      path.join(
        publicDir,
        href.slice(1),
      );

    if (
      !fs.existsSync(target)
    ) {
      fail(
        `${code}: target file missing ${href}`,
      );
    }
  }

  const lowerCode =
    code.toLowerCase();

  const subscriptionPath =
    `/calendar/${lowerCode}.ics`;

  if (
    !html.includes(
      subscriptionPath,
    )
  ) {
    fail(
      `${code}: subscription calendar link missing`,
    );
  }

  if (
    !fs.existsSync(
      path.join(
        publicDir,
        subscriptionPath.slice(1),
      ),
    )
  ) {
    fail(
      `${code}: subscription ICS file missing`,
    );
  }

  if (
    !html.includes(
      `/widget.html?state=${code}`,
    )
  ) {
    fail(
      `${code}: Widget link missing`,
    );
  }

  if (
    !html.includes(
      `/?state=${code}&year=${YEAR}`,
    )
  ) {
    fail(
      `${code}: app calendar link missing`,
    );
  }

  const dataset =
    datasets.get(code);

  if (!dataset) {
    fail(
      `${code}: holiday dataset not found`,
    );
  } else {
    const events =
      getEventsForYear(
        dataset,
      );

    const rowCount =
      countMatches(
        html,
        /<li class="gold-period-row"/g,
      );

    if (
      rowCount !==
      events.length
    ) {
      fail(
        `${code}: ${rowCount} Gold rows but ${events.length} dataset events overlap ${YEAR}`,
      );
    }

    for (
      const event of events
    ) {
      if (
        !html.includes(
          `id="termin-${event.id}"`,
        )
      ) {
        fail(
          `${code}: event row missing ${event.id}`,
        );
      }

      const range =
        `${formatDate(event.startDate)} – ${formatDate(event.endDate)}`;

      if (
        !html.includes(range)
      ) {
        fail(
          `${code}: event dates missing for ${event.id}: ${range}`,
        );
      }
    }

    const source =
      dataset.sources?.[0];

    if (!source) {
      fail(
        `${code}: source metadata missing in dataset`,
      );
    } else {
      if (
        source.sourceName &&
        !html.includes(
          escapeHtml(
            source.sourceName,
          ),
        )
      ) {
        fail(
          `${code}: official source name not shown`,
        );
      }

      if (
        source.sourceUrl &&
        !html.includes(
          escapeHtml(
            source.sourceUrl,
          ),
        )
      ) {
        fail(
          `${code}: official source URL not shown`,
        );
      }

      if (
        source.lastCheckedAt
      ) {
        const checked =
          formatDate(
            source.lastCheckedAt,
          );

        if (
          !html.includes(
            checked,
          )
        ) {
          fail(
            `${code}: source checked date ${checked} not shown`,
          );
        }
      }
    }
  }

  const sitemapNeedle =
    `<loc>${expectedCanonical}</loc>`;

  const sitemapCount =
    sitemap.split(
      sitemapNeedle,
    ).length - 1;

  if (
    sitemapCount !== 1
  ) {
    fail(
      `${code}: sitemap canonical count is ${sitemapCount}`,
    );
  }

  addDuplicateCheck(
    titles,
    title,
    "title",
    pageFile,
  );

  addDuplicateCheck(
    descriptions,
    description,
    "description",
    pageFile,
  );

  addDuplicateCheck(
    canonicals,
    canonical,
    "canonical",
    pageFile,
  );

  if (
    title &&
    (
      title.length < 35 ||
      title.length > 65
    )
  ) {
    warn(
      `${code}: title length ${title.length}`,
    );
  }

  if (
    description &&
    (
      description.length < 120 ||
      description.length > 170
    )
  ) {
    warn(
      `${code}: description length ${description.length}`,
    );
  }

  auditInternalPaths(
    html,
    pageFile,
  );

  records.push({
    code,
    name,
    file:
      pageFile,
    titleLength:
      title?.length || 0,
    descriptionLength:
      description?.length || 0,
    faqQuestionCount,
  });
}

console.log(
  `Audited ${records.length}/${STATES.length} Gold Pages for ${YEAR}.`,
);

console.log("");

for (
  const record
  of records
) {
  console.log(
    `✓ ${record.code} ${record.name}` +
    ` · title ${record.titleLength}` +
    ` · description ${record.descriptionLength}` +
    ` · FAQ ${record.faqQuestionCount}`,
  );
}

if (
  warnings.length > 0
) {
  console.log("");
  console.log(
    `Warnings: ${warnings.length}`,
  );

  for (
    const message
    of warnings
  ) {
    console.log(
      `⚠ ${message}`,
    );
  }
}

if (
  failures.length > 0
) {
  console.error("");
  console.error(
    `Failures: ${failures.length}`,
  );

  for (
    const message
    of failures
  ) {
    console.error(
      `✗ ${message}`,
    );
  }

  process.exitCode = 1;
} else {
  console.log("");
  console.log(
    "✅ 2027 Gold Page audit passed.",
  );
}
