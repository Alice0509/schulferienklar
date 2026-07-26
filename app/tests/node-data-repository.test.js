import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  createNodeHolidayRepository,
} from "../scripts/lib/node-data-repository.mjs";

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), {
    recursive: true,
  });

  fs.writeFileSync(
    filePath,
    `${JSON.stringify(data, null, 2)}\n`,
    "utf8",
  );
}

function createFixture() {
  const rootDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "schulferienklar-repository-"),
  );

  const publicDir = path.join(rootDir, "public");

  writeJson(
    path.join(
      publicDir,
      "data",
      "holidays",
      "index.json",
    ),
    {
      datasets: [
        {
          bundeslandCode: "BY",
          bundeslandName: "Bayern",
          jsonFile: "bayern.json",
        },
      ],
    },
  );

  writeJson(
    path.join(
      publicDir,
      "data",
      "holidays",
      "bayern.json",
    ),
    {
      holidays: [
        {
          id: "by-summer-2027",
          startDate: "2027-08-02",
          endDate: "2027-09-13",
        },
      ],
    },
  );

  writeJson(
    path.join(
      publicDir,
      "data",
      "public-holidays",
      "index.json",
    ),
    {
      datasets: [
        {
          bundeslandCode: "BY",
          year: 2027,
          jsonFile: "by-2027.json",
        },
      ],
    },
  );

  writeJson(
    path.join(
      publicDir,
      "data",
      "public-holidays",
      "by-2027.json",
    ),
    {
      holidays: [
        {
          id: "by-new-year-2027",
          date: "2027-01-01",
        },
      ],
    },
  );

  return {
    rootDir,
    publicDir,
  };
}

test("node repository loads school and public holiday datasets", () => {
  const fixture = createFixture();

  try {
    const repository = createNodeHolidayRepository({
      publicDir: fixture.publicDir,
    });

    assert.equal(
      repository.findSchoolHolidayDatasetMeta("BY")
        ?.jsonFile,
      "bayern.json",
    );

    assert.equal(
      repository.findPublicHolidayDatasetMeta("BY", 2027)
        ?.jsonFile,
      "by-2027.json",
    );

    assert.equal(
      repository.loadSchoolHolidayDataset("BY")
        ?.holidays?.[0]?.id,
      "by-summer-2027",
    );

    assert.equal(
      repository.loadPublicHolidayDataset("BY", 2027)
        ?.holidays?.[0]?.id,
      "by-new-year-2027",
    );
  } finally {
    fs.rmSync(fixture.rootDir, {
      recursive: true,
      force: true,
    });
  }
});

test("node repository returns null when metadata is unavailable", () => {
  const fixture = createFixture();

  try {
    const repository = createNodeHolidayRepository({
      publicDir: fixture.publicDir,
    });

    assert.equal(
      repository.findSchoolHolidayDatasetMeta("XX"),
      null,
    );

    assert.equal(
      repository.findPublicHolidayDatasetMeta(
        "BY",
        2040,
      ),
      null,
    );

    assert.equal(
      repository.loadSchoolHolidayDataset("XX"),
      null,
    );

    assert.equal(
      repository.loadPublicHolidayDataset("BY", 2040),
      null,
    );
  } finally {
    fs.rmSync(fixture.rootDir, {
      recursive: true,
      force: true,
    });
  }
});

test("node repository caches repeated file reads", () => {
  const fixture = createFixture();
  const readCounts = new Map();

  try {
    const repository = createNodeHolidayRepository({
      publicDir: fixture.publicDir,
      readFileImpl(filePath, encoding) {
        const normalizedPath = path.resolve(filePath);

        readCounts.set(
          normalizedPath,
          (readCounts.get(normalizedPath) || 0) + 1,
        );

        return fs.readFileSync(
          normalizedPath,
          encoding,
        );
      },
    });

    repository.loadSchoolHolidayIndex();
    repository.loadSchoolHolidayIndex();

    repository.loadSchoolHolidayDataset("BY");
    repository.loadSchoolHolidayDataset("BY");

    repository.loadPublicHolidayIndex();
    repository.loadPublicHolidayIndex();

    repository.loadPublicHolidayDataset("BY", 2027);
    repository.loadPublicHolidayDataset("BY", 2027);

    assert.equal(
      [...readCounts.values()].every(
        (count) => count === 1,
      ),
      true,
    );

    assert.equal(readCounts.size, 4);
  } finally {
    fs.rmSync(fixture.rootDir, {
      recursive: true,
      force: true,
    });
  }
});
