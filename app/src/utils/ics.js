function parseDateKey(dateKey) {
  const [year, month, day] = String(dateKey).split("-").map(Number);

  if (!year || !month || !day) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }

  return new Date(year, month - 1, day);
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}${month}${day}`;
}

function addDays(dateKey, days) {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

function formatDateKey(dateKey) {
  return formatDate(parseDateKey(dateKey));
}

function formatTimestamp(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function escapeText(value) {
  return String(value || "")
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\n", "\\n");
}

function createEvent({ uid, title, startDate, endDate, description }) {
  return [
    "BEGIN:VEVENT",
    `UID:${escapeText(uid)}`,
    `DTSTAMP:${formatTimestamp()}`,
    `DTSTART;VALUE=DATE:${formatDateKey(startDate)}`,
    `DTEND;VALUE=DATE:${addDays(endDate, 1)}`,
    `SUMMARY:${escapeText(title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    "END:VEVENT",
  ].join("\r\n");
}

export function generateIcsCalendar({
  holidays = [],
  publicHolidays = [],
  selectedCode,
  selectedYear,
}) {
  const yearStart = `${selectedYear}-01-01`;
  const yearEnd = `${selectedYear}-12-31`;

  const schoolEvents = holidays
    .filter((holiday) => {
      return holiday.startDate <= yearEnd && holiday.endDate >= yearStart;
    })
    .map((holiday) => {
      const name = holiday.name?.de || holiday.name || "Schulferien";
      const category =
        holiday.category === "school_free" ? "Unterrichtsfrei" : "Schulferien";

      return createEvent({
        uid: `${holiday.id || `${selectedCode}-${holiday.startDate}-${holiday.endDate}`}@schulferienklar.de`,
        title: `${name} (${category})`,
        startDate: holiday.startDate,
        endDate: holiday.endDate,
        description: `Schulferienklar · ${category} · ${selectedCode}`,
      });
    });

  const publicEvents = publicHolidays
    .filter((holiday) => {
      return (
        holiday.includeInDefaultCalendar === true &&
        String(holiday.date || "").startsWith(String(selectedYear))
      );
    })
    .map((holiday) => {
      const name = holiday.name?.de || holiday.name || "Feiertag";

      return createEvent({
        uid: `${holiday.id || `${selectedCode}-${holiday.date}`}@schulferienklar.de`,
        title: `${name} (Feiertag)`,
        startDate: holiday.date,
        endDate: holiday.date,
        description: `Schulferienklar · Feiertag · ${selectedCode}`,
      });
    });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Schulferienklar//Calendar Export//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:Schulferienklar ${selectedCode} ${selectedYear}`,
    ...schoolEvents,
    ...publicEvents,
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcsFile({ content, selectedCode, selectedYear }) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `schulferienklar-${String(selectedCode).toLowerCase()}-${selectedYear}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}
