import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateEffectivePeriod,
  daysUntil,
  formatDateRange,
  getCountdownLabel,
  parseWidgetOptions,
  selectUpcomingSchoolEvents,
} from "../public/widgets/next-school-holidays-core.js";

test(
  "위젯 URL 옵션을 정규화한다",
  () => {
    assert.deepEqual(
      parseWidgetOptions(
        "?state=nw&theme=dark&count=2",
      ),
      {
        state: "NW",
        theme: "dark",
        count: 2,
      },
    );
  },
);

test(
  "잘못된 옵션에는 기본값을 사용한다",
  () => {
    assert.deepEqual(
      parseWidgetOptions(
        "?state=by&theme=unknown&count=9",
      ),
      {
        state: "BY",
        theme: "light",
        count: 3,
      },
    );
  },
);

test(
  "진행 중인 방학을 포함하고 중복 일정을 제거한다",
  () => {
    const ongoingEvent = {
      id: "summer",
      kind: "school_holiday",
      startDate: "2026-07-20",
      endDate: "2026-08-10",
      includeInDefaultCalendar: true,
    };

    const nextEvent = {
      id: "autumn",
      kind: "school_holiday",
      startDate: "2026-10-20",
      endDate: "2026-10-30",
      includeInDefaultCalendar: true,
    };

    const result =
      selectUpcomingSchoolEvents(
        [
          {
            events: [
              ongoingEvent,
              {
                ...ongoingEvent,
              },
            ],
          },
          {
            events: [
              nextEvent,
              {
                id: "public",
                kind: "public_holiday",
                startDate: "2026-10-03",
                endDate: "2026-10-03",
                includeInDefaultCalendar:
                  true,
              },
            ],
          },
        ],
        "2026-07-29",
        3,
      );

    assert.deepEqual(
      result.map(
        (event) => event.id,
      ),
      [
        "summer",
        "autumn",
      ],
    );
  },
);

test(
  "주말을 포함한 연속 휴일을 계산한다",
  () => {
    const result =
      calculateEffectivePeriod(
        {
          startDate: "2026-08-03",
          endDate: "2026-08-14",
        },
        [],
      );

    assert.deepEqual(result, {
      startDate: "2026-08-01",
      endDate: "2026-08-16",
      differsFromOfficial: true,
    });
  },
);

test(
  "인접 공휴일과 주말을 함께 확장한다",
  () => {
    const result =
      calculateEffectivePeriod(
        {
          startDate: "2026-05-26",
          endDate: "2026-05-29",
        },
        [
          {
            kind: "public_holiday",
            startDate: "2026-05-25",
            includeInDefaultCalendar:
              true,
          },
        ],
      );

    assert.deepEqual(result, {
      startDate: "2026-05-23",
      endDate: "2026-05-31",
      differsFromOfficial: true,
    });
  },
);

test(
  "진행 중과 예정된 방학의 안내 문구를 만든다",
  () => {
    assert.equal(
      getCountdownLabel(
        {
          startDate: "2026-07-20",
          endDate: "2026-08-10",
        },
        "2026-07-29",
      ),
      "Läuft gerade",
    );

    assert.equal(
      getCountdownLabel(
        {
          startDate: "2026-08-03",
          endDate: "2026-09-14",
        },
        "2026-07-29",
      ),
      "Noch 5 Tage",
    );

    assert.equal(
      daysUntil(
        "2026-08-03",
        "2026-07-29",
      ),
      5,
    );
  },
);

test(
  "독일식 날짜 범위를 만든다",
  () => {
    assert.equal(
      formatDateRange(
        "2026-08-03",
        "2026-08-14",
      ),
      "03.–14.08.2026",
    );

    assert.equal(
      formatDateRange(
        "2026-12-24",
        "2027-01-08",
      ),
      "24.12.2026–08.01.2027",
    );
  },
);
