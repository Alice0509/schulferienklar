import test from "node:test";
import process from "node:process";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("Berlin's one-off 2028 holiday survives regeneration without leaking to other states or years", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "sfk-one-off-"));
  try {
    execFileSync(process.execPath, [path.join(root, "scripts/generate-public-holidays-2028.mjs")], {
      cwd: temp,
      stdio: "pipe",
    });
    const files = fs.readdirSync(path.join(root, "data/public-holidays"))
      .filter((file) => file !== "index.json" && file.endsWith(".json"));
    const matches = files.flatMap((file) => {
      const data = JSON.parse(fs.readFileSync(path.join(root, "data/public-holidays", file), "utf8"));
      return data.holidays.filter((holiday) => holiday.id.endsWith("-uprising-anniversary"))
        .map((holiday) => ({ data, holiday }));
    });
    assert.equal(matches.length, 1);
    const { data, holiday } = matches[0];
    assert.equal(data.bundeslandCode, "BE");
    assert.equal(data.year, 2028);
    assert.equal(holiday.date, "2028-06-17");
    assert.equal(holiday.scope, "statewide");
    assert.equal(holiday.includeInDefaultCalendar, true);
    assert.ok(holiday.sourceUrl.includes("berlin.de/sen/justiz/"));
    assert.equal(holiday.lastCheckedAt, "2026-10-12");
    for (const file of files.filter((name) => name.endsWith("_2028.json"))) {
      assert.equal(fs.readFileSync(path.join(temp, "data/public-holidays", file), "utf8"),
        fs.readFileSync(path.join(root, "data/public-holidays", file), "utf8"));
      assert.equal(fs.readFileSync(path.join(temp, "app/public/data/public-holidays", file), "utf8"),
        fs.readFileSync(path.join(root, "app/public/data/public-holidays", file), "utf8"));
    }
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
