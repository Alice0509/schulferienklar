import fs from "node:fs";
import path from "node:path";

import {
  PDFDocument,
} from "pdf-lib";

const publicDir = path.resolve("public");
const downloadsDir = path.join(
  publicDir,
  "downloads",
);

const manifestPath = path.join(
  downloadsDir,
  "jahreskalender-index.json",
);

const errors = [];

function fail(message) {
  errors.push(message);
}

function requireFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    fail(`${label}: 파일 없음`);
    return false;
  }

  return true;
}

if (!requireFile(
  manifestPath,
  "Jahreskalender manifest",
)) {
  throw new Error(errors.join("\n"));
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
  fail(
    `manifest 조합 수: ${calendars.length}, 예상 80`,
  );
}

const generatedFiles =
  fs.readdirSync(downloadsDir);

const htmlFiles =
  generatedFiles.filter((file) => {
    return /^jahreskalender-.+-\d{4}\.html$/.test(
      file,
    );
  });

const icsFiles =
  generatedFiles.filter((file) => {
    return /^schulferien-.+-\d{4}\.ics$/.test(
      file,
    );
  });

const pdfFiles =
  generatedFiles.filter((file) => {
    return /^schulferien-.+-\d{4}\.pdf$/.test(
      file,
    );
  });

if (htmlFiles.length !== 80) {
  fail(
    `HTML 파일 수: ${htmlFiles.length}, 예상 80`,
  );
}

if (icsFiles.length !== 80) {
  fail(
    `ICS 파일 수: ${icsFiles.length}, 예상 80`,
  );
}

if (pdfFiles.length !== 80) {
  fail(
    `PDF 파일 수: ${pdfFiles.length}, 예상 80`,
  );
}

const subscriptionCodes = new Set();

for (const calendar of calendars) {
  const htmlPath = path.join(
    publicDir,
    calendar.htmlUrl.replace(
      /^\/+/,
      "",
    ),
  );

  const icsPath = path.join(
    publicDir,
    calendar.icsUrl.replace(
      /^\/+/,
      "",
    ),
  );

  const pdfPath = path.join(
    publicDir,
    calendar.pdfUrl.replace(
      /^\/+/,
      "",
    ),
  );

  const subscriptionPath = path.join(
    publicDir,
    calendar.subscriptionUrl.replace(
      /^\/+/,
      "",
    ),
  );

  if (
    requireFile(
      htmlPath,
      calendar.htmlUrl,
    )
  ) {
    const html = fs.readFileSync(
      htmlPath,
      "utf8",
    );

    const checks = [
      [
        "PDF 링크",
        `href="${calendar.pdfUrl}"`,
      ],
      [
        "PDF 버튼",
        "PDF herunterladen",
      ],
      [
        "구독 버튼",
        "Kalender abonnieren",
      ],
      [
        "ICS 버튼",
        "ICS-Datei herunterladen",
      ],
      [
        "인쇄 버튼",
        'onclick="window.print()"',
      ],
    ];

    for (
      const [
        label,
        value,
      ] of checks
    ) {
      if (!html.includes(value)) {
        fail(
          `${calendar.htmlUrl}: ${label} 누락`,
        );
      }
    }
  }

  if (
    requireFile(
      icsPath,
      calendar.icsUrl,
    )
  ) {
    const ics = fs.readFileSync(
      icsPath,
      "utf8",
    );

    if (
      !ics.startsWith(
        "BEGIN:VCALENDAR\r\n",
      )
    ) {
      fail(
        `${calendar.icsUrl}: VCALENDAR 시작 형식 오류`,
      );
    }

    if (
      !ics.includes(
        "\r\nEND:VCALENDAR\r\n",
      )
    ) {
      fail(
        `${calendar.icsUrl}: VCALENDAR 종료 누락`,
      );
    }

    if (
      !ics.includes(
        "DTSTART;VALUE=DATE:",
      )
    ) {
      fail(
        `${calendar.icsUrl}: 이벤트 날짜 없음`,
      );
    }
  }

  if (
    requireFile(
      subscriptionPath,
      calendar.subscriptionUrl,
    )
  ) {
    subscriptionCodes.add(
      calendar.stateCode,
    );
  }

  if (
    requireFile(
      pdfPath,
      calendar.pdfUrl,
    )
  ) {
    const bytes =
      fs.readFileSync(pdfPath);

    if (
      bytes
        .subarray(0, 5)
        .toString("ascii") !== "%PDF-"
    ) {
      fail(
        `${calendar.pdfUrl}: PDF 헤더 오류`,
      );
      continue;
    }

    if (bytes.length < 10000) {
      fail(
        `${calendar.pdfUrl}: PDF 크기가 너무 작음 (${bytes.length})`,
      );
      continue;
    }

    try {
      const document =
        await PDFDocument.load(bytes);

      const pageCount =
        document.getPageCount();

      if (pageCount !== 1) {
        fail(
          `${calendar.pdfUrl}: ${pageCount}페이지, 예상 1페이지`,
        );
      }

      const page =
        document.getPage(0);

      const {
        width,
        height,
      } = page.getSize();

      const landscape =
        width > height;

      const a4Landscape =
        width >= 820 &&
        width <= 860 &&
        height >= 575 &&
        height <= 615;

      if (!landscape) {
        fail(
          `${calendar.pdfUrl}: 가로 방향이 아님 (${width}×${height})`,
        );
      }

      if (!a4Landscape) {
        fail(
          `${calendar.pdfUrl}: A4 가로 크기 아님 (${width}×${height})`,
        );
      }
    } catch (error) {
      fail(
        `${calendar.pdfUrl}: PDF 해석 실패 - ${
          error instanceof Error
            ? error.message
            : String(error)
        }`,
      );
    }
  }
}

if (subscriptionCodes.size !== 16) {
  fail(
    `구독 피드 주 수: ${subscriptionCodes.size}, 예상 16`,
  );
}

if (errors.length > 0) {
  console.error(
    errors
      .map(
        (error) => `❌ ${error}`,
      )
      .join("\n"),
  );

  process.exit(1);
}

console.log(
  "✅ Jahreskalender validation passed " +
    "(80 HTML, 80 ICS, 80 PDF, 16 subscription feeds).",
);
