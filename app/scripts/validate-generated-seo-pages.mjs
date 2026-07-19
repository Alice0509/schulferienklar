import fs from "node:fs";
import path from "node:path";

const publicDir = path.join(process.cwd(), "public");
const sitemapPath = path.join(publicDir, "sitemap.xml");

const requiredFiles = [
  "sitemap.xml",
  "seo-pages.css",
  "schulferien-2026.html",
  "schulferien-bayern.html",
  "schulferien-bayern-2026.html",
];

const htmlFiles = fs
  .readdirSync(publicDir)
  .filter((file) => file.endsWith(".html"))
  .filter((file) => file.startsWith("schulferien-"));

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
    ["canonical", /<link rel="canonical" href="https:\/\/www\.schulferienklar\.de\/[^"]+"/],
    ["shared stylesheet", /<link rel="stylesheet" href="\/seo-pages\.css" \/>/],
    ["h1", /<h1>.+<\/h1>/s],
  ];

  for (const [label, pattern] of checks) {
    if (!pattern.test(html)) {
      errors.push(`${file}: missing ${label}`);
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
