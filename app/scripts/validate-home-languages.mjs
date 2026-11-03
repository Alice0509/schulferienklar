import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const sitemap = fs.readFileSync(path.join(root, "public", "sitemap.xml"), "utf8");
const germanHtml = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const englishHtml = fs.readFileSync(path.join(dist, "en", "calendar.html"), "utf8");

const checks = [
  ["German default language", germanHtml.includes('<html lang="de">')],
  ["English home language", englishHtml.includes('<html lang="en">')],
  ["German canonical", germanHtml.includes('rel="canonical" href="https://www.schulferienklar.de/"')],
  ["English canonical", englishHtml.includes('rel="canonical" href="https://www.schulferienklar.de/en/calendar.html"')],
  ["German English alternate", germanHtml.includes('hreflang="en" href="https://www.schulferienklar.de/en/calendar.html"')],
  ["English German alternate", englishHtml.includes('hreflang="de" href="https://www.schulferienklar.de/"')],
  ["English title", englishHtml.includes("School holidays and public holidays at a glance")],
  ["English language route in sitemap", sitemap.includes("https://www.schulferienklar.de/en/calendar.html")],
  ["English React app entry", /<script[^>]*type="module"[^>]*src="\/assets\//.test(englishHtml)],
];
const failed = checks.filter(([, success]) => !success);
if (failed.length > 0) {
  for (const [name] of failed) console.error("FAIL:", name);
  process.exit(1);
}
console.log("DE/EN React home HTML, canonical, hreflang and sitemap checks passed.");
