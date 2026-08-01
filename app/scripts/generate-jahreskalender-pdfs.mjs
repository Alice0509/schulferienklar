import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawnSync } from "node:child_process";

import puppeteer from "puppeteer-core";

const publicDir = path.resolve("public");
const downloadsDir = path.join(
  publicDir,
  "downloads",
);

const manifestPath = path.join(
  downloadsDir,
  "jahreskalender-index.json",
);

function commandPath(command) {
  const result = spawnSync(
    "which",
    [command],
    {
      encoding: "utf8",
    },
  );

  if (result.status !== 0) {
    return null;
  }

  return result.stdout.trim() || null;
}

function findChromeExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    commandPath("google-chrome"),
    commandPath("google-chrome-stable"),
    commandPath("chromium"),
    commandPath("chromium-browser"),
  ].filter(Boolean);

  const executable = candidates.find(
    (candidate) => {
      return fs.existsSync(candidate);
    },
  );

  if (!executable) {
    throw new Error(
      "Google Chrome 또는 Chromium 실행 파일을 찾지 못했습니다.",
    );
  }

  return executable;
}

function contentType(filePath) {
  const extension = path
    .extname(filePath)
    .toLowerCase();

  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".ics": "text/calendar; charset=utf-8",
  };

  return (
    types[extension] ||
    "application/octet-stream"
  );
}

function createStaticServer() {
  const server = http.createServer(
    (request, response) => {
      try {
        const requestUrl = new URL(
          request.url || "/",
          "http://127.0.0.1",
        );

        const relativePath = decodeURIComponent(
          requestUrl.pathname,
        ).replace(/^\/+/, "");

        let filePath = path.resolve(
          publicDir,
          relativePath || "index.html",
        );

        const publicPrefix =
          `${publicDir}${path.sep}`;

        if (
          filePath !== publicDir &&
          !filePath.startsWith(publicPrefix)
        ) {
          response.writeHead(403);
          response.end("Forbidden");
          return;
        }

        if (
          fs.existsSync(filePath) &&
          fs.statSync(filePath).isDirectory()
        ) {
          filePath = path.join(
            filePath,
            "index.html",
          );
        }

        if (!fs.existsSync(filePath)) {
          response.writeHead(404);
          response.end("Not found");
          return;
        }

        response.writeHead(
          200,
          {
            "Content-Type":
              contentType(filePath),
            "Cache-Control": "no-store",
          },
        );

        fs.createReadStream(filePath)
          .pipe(response);
      } catch (error) {
        response.writeHead(500);
        response.end(
          error instanceof Error
            ? error.message
            : "Server error",
        );
      }
    },
  );

  return new Promise((resolve, reject) => {
    server.once("error", reject);

    server.listen(
      0,
      "127.0.0.1",
      () => {
        const address = server.address();

        if (
          !address ||
          typeof address === "string"
        ) {
          reject(
            new Error(
              "로컬 서버 포트를 확인하지 못했습니다.",
            ),
          );
          return;
        }

        resolve({
          server,
          port: address.port,
        });
      },
    );
  });
}

function clearGeneratedPdfs() {
  for (const fileName of fs.readdirSync(
    downloadsDir,
  )) {
    if (
      /^schulferien-.+-\d{4}\.pdf$/.test(
        fileName,
      )
    ) {
      fs.unlinkSync(
        path.join(
          downloadsDir,
          fileName,
        ),
      );
    }
  }
}

if (!fs.existsSync(manifestPath)) {
  throw new Error(
    "jahreskalender-index.json이 없습니다. " +
      "먼저 npm run generate:jahreskalender를 실행하세요.",
  );
}

const manifest = JSON.parse(
  fs.readFileSync(
    manifestPath,
    "utf8",
  ),
);

const calendars =
  manifest.calendars || [];

if (calendars.length !== 80) {
  throw new Error(
    `Jahreskalender 조합 수 오류: ${calendars.length}`,
  );
}

const executablePath =
  findChromeExecutable();

console.log(
  `Chrome: ${executablePath}`,
);

clearGeneratedPdfs();

const {
  server,
  port,
} = await createStaticServer();

let browser;

try {
  browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      "--disable-dev-shm-usage",
      "--disable-gpu",
      ...(process.platform === "linux"
        ? ["--no-sandbox"]
        : []),
    ],
  });

  const page = await browser.newPage();

  await page.emulateMediaType("print");

  for (
    let index = 0;
    index < calendars.length;
    index += 1
  ) {
    const calendar = calendars[index];

    const htmlUrl =
      `http://127.0.0.1:${port}` +
      calendar.htmlUrl;

    const pdfPath = path.join(
      publicDir,
      calendar.pdfUrl.replace(
        /^\/+/,
        "",
      ),
    );

    await page.goto(
      htmlUrl,
      {
        waitUntil: "networkidle0",
        timeout: 30000,
      },
    );

    await page.evaluate(async () => {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
    });

    await page.pdf({
      path: pdfPath,
      format: "A4",
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
    });

    const size =
      fs.statSync(pdfPath).size;

    if (size < 10000) {
      throw new Error(
        `PDF 파일이 너무 작습니다: ${calendar.pdfUrl} (${size} bytes)`,
      );
    }

    if (
      (index + 1) % 10 === 0 ||
      index === calendars.length - 1
    ) {
      console.log(
        `created ${index + 1}/${calendars.length} PDFs`,
      );
    }
  }

  await page.close();
} finally {
  if (browser) {
    await browser.close();
  }

  await new Promise((resolve) => {
    server.close(resolve);
  });
}

console.log(
  `✅ Created ${calendars.length} Jahreskalender PDF files.`,
);
