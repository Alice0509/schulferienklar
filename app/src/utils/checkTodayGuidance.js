export const NEED_OPTIONS = [
  {
    id: "water",
    label: "Water",
  },
  {
    id: "groceries",
    label: "Groceries",
  },
  {
    id: "cigarettes",
    label: "Cigarettes",
  },
  {
    id: "cafes-bakeries",
    label: "Cafés & bakeries",
  },
  {
    id: "pharmacy",
    label: "Pharmacy",
  },
];

export const NEED_GUIDANCE = {
  water: {
    title: "Buying water",
    fallbackPlaces: [
      "major train stations",
      "airports",
      "gas stations",
      "kiosks",
      "cafés",
      "bakeries",
      "restaurants",
      "hotel reception",
      "vending machines where available",
    ],
    note:
      "For water, travelers often check transport hubs, gas stations, kiosks, cafés, bakeries, restaurants or hotel reception first.",
  },
  groceries: {
    title: "Buying groceries",
    fallbackPlaces: [
      "major train stations",
      "airports",
      "gas stations",
      "selected kiosks",
      "small convenience-style shops where available",
    ],
    note:
      "Regular supermarkets are usually closed on Sundays and public holidays. Train stations, airports, gas stations or kiosks may be better fallback options.",
  },
  cigarettes: {
    title: "Buying cigarettes",
    fallbackPlaces: [
      "kiosks",
      "gas stations",
      "tobacco shops if open",
      "vending machines where available and age verification works",
      "some train station shops",
    ],
    note:
      "Tobacco availability may depend on age verification, local rules and exact opening hours. The app should not provide exact vending machine locations.",
  },
  "cafes-bakeries": {
    title: "Cafés and bakeries",
    fallbackPlaces: [
      "city centers",
      "tourist areas",
      "major train stations",
      "airports",
      "restaurants",
      "hotel cafés",
    ],
    note:
      "Cafés, bakeries and restaurants may still be open in tourist areas, city centers, train stations and airports, but exact hours vary.",
  },
  pharmacy: {
    title: "Pharmacies",
    fallbackPlaces: [
      "official emergency pharmacy services",
      "Google Maps",
      "local pharmacy websites",
      "hotel reception for local guidance",
    ],
    note:
      "Regular pharmacies may be closed on Sundays and public holidays. Emergency pharmacies vary by date and location, so travelers should check an official emergency pharmacy service or Google Maps.",
  },
};

export function getNeedGuidance(needId) {
  return NEED_GUIDANCE[needId] || null;
}

export function getFallbackPlaceText(needId) {
  const guidance = getNeedGuidance(needId);

  if (!guidance) {
    return "";
  }

  return guidance.fallbackPlaces.join(", ");
}

export function getCheckTodayTitle({ cityName, isSunday, publicHoliday } = {}) {
  const place = cityName || "Germany";

  if (publicHoliday) {
    const holidayName =
      publicHoliday.name?.en || publicHoliday.name?.de || publicHoliday.name || "a public holiday";

    return `Today is ${holidayName} in ${place}.`;
  }

  if (isSunday) {
    return `Today is Sunday in ${place}.`;
  }

  return `Today in ${place} looks normal.`;
}

export function getCheckTodaySummary({
  cityName,
  bundeslandName,
  isSunday,
  publicHoliday,
  schoolHoliday,
} = {}) {
  const place = cityName || "your city";
  const stateName = bundeslandName || "this federal state";

  if (publicHoliday) {
    return `Regular shops and supermarkets are usually closed on public holidays in Germany. In ${place}, check transport hubs, airports, gas stations, cafés, bakeries, restaurants or official business pages before relying on a specific place.`;
  }

  if (isSunday) {
    return `Most regular supermarkets and many shops are usually closed on Sundays in Germany. In ${place}, travelers often check major train stations, airports, gas stations, kiosks, cafés, bakeries, restaurants or hotel reception for essentials.`;
  }

  if (schoolHoliday) {
    return `This date falls during a school holiday period in ${stateName}. Shops are not usually closed because of school holidays, but trains, hotels, attractions and roads may be busier.`;
  }

  return `This looks like a regular weekday in ${place}. Regular shops, supermarkets, cafés and services are generally more likely to be open, but exact hours still vary by business.`;
}

export function getCheckTodayDisclaimer() {
  return "Exact opening hours change often. Always check Google Maps or the official business website before relying on a specific shop, café, pharmacy, station or attraction.";
}
