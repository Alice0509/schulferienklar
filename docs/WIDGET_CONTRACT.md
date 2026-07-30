# Nächste Schulferien Widget 계약

업데이트: 2026-07-29

## 1. 목적

Schulferienklar의 첫 외부 배포 제품은 무료로 사용할 수 있는
`Nächste Schulferien Widget`이다.

이 위젯은 외부 웹사이트에서 선택한 Bundesland의 다음 학교 방학을
자동으로 보여준다.

첫 버전의 목적은 즉시 유료화하는 것이 아니라 다음을 검증하는 것이다.

- 외부 웹사이트가 위젯을 실제로 설치하는지
- 어떤 업종이 방학 데이터에 관심을 보이는지
- 색상 변경, 여러 Bundesland, 로고 제거 수요가 있는지
- API 또는 맞춤 데이터 문의로 이어지는지

## 2. 공개 URL

기본 URL:

    https://www.schulferienklar.de/widgets/naechste-schulferien.html

사용 예:

    https://www.schulferienklar.de/widgets/naechste-schulferien.html?state=BY&theme=light&count=3

## 3. URL 파라미터

### state

독일 Bundesland의 두 글자 코드다.

예:

    BY
    NW
    BE
    HH

기본값:

    BY

지원 여부는 다음 파일을 기준으로 확인한다.

    /api/v1/states.json

### theme

지원값:

    light
    dark

기본값:

    light

### count

표시할 방학 수다.

지원값:

    1
    2
    3

기본값:

    3

## 4. 데이터 계약

위젯은 Schulferienklar의 동일 출처 정적 API만 사용한다.

    /api/v1/states.json
    /api/v1/calendar/{state}/{year}.json

외부 API나 제3자 스크립트는 사용하지 않는다.

표시 대상:

    school_holiday
    state_school_free_day

`includeInDefaultCalendar`가 `false`인 일정은 표시하지 않는다.

현재 진행 중인 방학은 종료일까지 첫 번째 결과로 유지한다.

연도를 넘나드는 중복 일정은 다음 값의 조합으로 제거한다.

- 일정 ID
- 시작일
- 종료일

## 5. 표시 내용

첫 위젯은 다음 정보를 보여준다.

- Bundesland 이름
- 다음 방학 이름
- 공식 시작일
- 공식 종료일
- 방학 시작까지 남은 날짜
- 진행 중인 방학 여부
- 계산 가능한 경우 `Zusammenhängend frei`
- 다음 방학 1~3개
- 공식 출처
- 마지막 확인일
- Schulferienklar 출처 링크

## 6. 공식 기간과 계산 기간

공식 학교 방학 기간과 계산된 연속 휴일은 반드시 분리해서 표시한다.

`Zusammenhängend frei`에는 학교 방학에 직접 이어지는 다음 날짜만 포함한다.

- 토요일
- 일요일
- 기본 캘린더에 포함되는 해당 Bundesland의 공휴일

학교별 자율 휴업일이나 확인되지 않은 지역 예외는 자동으로 포함하지 않는다.

## 7. 개인정보와 광고

위젯에는 다음을 사용하지 않는다.

- 쿠키
- localStorage
- 회원 계정
- 행동 기반 추적
- Microsoft Clarity
- 광고
- 외부 분석 스크립트

추천 iframe에는 다음 속성을 사용한다.

    referrerpolicy="strict-origin"

이를 통해 삽입한 페이지의 전체 URL은 전달하지 않고,
일반적인 서버 로그에서 출처 도메인 정도만 확인할 수 있게 한다.

## 8. 검색 노출

iframe용 위젯 문서는 다음 설정을 사용한다.

    noindex, nofollow

위젯 설정과 미리보기를 제공하는 별도 공개 페이지는 검색 노출이 가능하다.

## 9. 추천 iframe 구조

    <iframe
      src="https://www.schulferienklar.de/widgets/naechste-schulferien.html?state=BY&amp;theme=light&amp;count=3"
      title="Nächste Schulferien in Bayern"
      loading="lazy"
      referrerpolicy="strict-origin"
      sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      style="width: 100%; max-width: 480px; height: 520px; border: 0"
    ></iframe>

## 10. 오류 처리

데이터를 불러오지 못하면 위젯 내부에 다음을 표시한다.

- 짧은 오류 안내
- Schulferienklar 일반 페이지 링크

위젯 오류가 삽입한 외부 웹사이트의 레이아웃이나 기능을 방해하면 안 된다.

## 11. 첫 버전에서 제외하는 것

이번 MVP에는 다음을 포함하지 않는다.

- 사용자 지정 색상
- 사용자 지정 글꼴
- 고객 로고
- Schulferienklar 표시 제거
- 여러 Bundesland 동시 표시
- 자동 iframe 높이 조정
- 회원 계정
- 결제
- API 키
- 설치 통계 대시보드

이 기능들은 실제 외부 수요가 확인된 후 검토한다.
