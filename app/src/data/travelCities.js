export const TRAVEL_CITIES = [
  {
    id: "berlin",
    name: "Berlin",
    bundeslandCode: "BE",
    bundeslandName: "Berlin",
    aliases: ["Berlin"],
    travelerNote:
      "Germany's capital city. Public holidays and school holidays follow the Berlin state calendar.",
  },
  {
    id: "munich",
    name: "Munich",
    localName: "München",
    bundeslandCode: "BY",
    bundeslandName: "Bayern",
    englishStateName: "Bavaria",
    aliases: ["Munich", "München", "Muenchen"],
    travelerNote:
      "Munich is in Bavaria. Some Bavarian holidays can be regional or local, so travelers should check the exact city and date.",
  },
  {
    id: "hamburg",
    name: "Hamburg",
    bundeslandCode: "HH",
    bundeslandName: "Hamburg",
    aliases: ["Hamburg"],
    travelerNote:
      "Hamburg is both a city and a federal state. Use the Hamburg calendar for public holidays and school holiday travel warnings.",
  },
  {
    id: "cologne",
    name: "Cologne",
    localName: "Köln",
    bundeslandCode: "NW",
    bundeslandName: "Nordrhein-Westfalen",
    englishStateName: "North Rhine-Westphalia",
    aliases: ["Cologne", "Köln", "Koeln"],
    travelerNote:
      "Cologne is in North Rhine-Westphalia. Check the North Rhine-Westphalia calendar for statewide holidays and school holiday periods.",
  },
  {
    id: "frankfurt",
    name: "Frankfurt",
    localName: "Frankfurt am Main",
    bundeslandCode: "HE",
    bundeslandName: "Hessen",
    englishStateName: "Hesse",
    aliases: ["Frankfurt", "Frankfurt am Main"],
    travelerNote:
      "Frankfurt am Main is in Hesse. It is a major transport hub, so public holidays and school holidays may affect travel demand.",
  },
  {
    id: "stuttgart",
    name: "Stuttgart",
    bundeslandCode: "BW",
    bundeslandName: "Baden-Württemberg",
    aliases: ["Stuttgart"],
    travelerNote:
      "Stuttgart is in Baden-Württemberg. Use the Baden-Württemberg calendar for statewide public holidays and school holidays.",
  },
  {
    id: "dresden",
    name: "Dresden",
    bundeslandCode: "SN",
    bundeslandName: "Sachsen",
    englishStateName: "Saxony",
    aliases: ["Dresden"],
    travelerNote:
      "Dresden is in Saxony. Use the Saxony calendar for statewide public holidays and school holiday periods.",
  },
  {
    id: "nuremberg",
    name: "Nuremberg",
    localName: "Nürnberg",
    bundeslandCode: "BY",
    bundeslandName: "Bayern",
    englishStateName: "Bavaria",
    aliases: ["Nuremberg", "Nürnberg", "Nuernberg"],
    travelerNote:
      "Nuremberg is in Bavaria. Bavarian public holidays and school holidays may affect travel planning.",
  },
];

export function findTravelCityById(cityId) {
  return TRAVEL_CITIES.find((city) => city.id === cityId) || null;
}

export function findTravelCityByName(input) {
  const normalizedInput = String(input || "").trim().toLowerCase();

  if (!normalizedInput) {
    return null;
  }

  return (
    TRAVEL_CITIES.find((city) =>
      city.aliases.some((alias) => alias.toLowerCase() === normalizedInput),
    ) || null
  );
}
