// StatAtlas data: 12 countries, 6 indicators, 72 figures.
// Every figure is rounded to the unit shown and labelled with its source
// and year on the pages that show it. The Sources page explains the
// method, the rounding and what is not covered here.

export const INDICATORS = [
  {
    id: "population",
    name: "Population",
    unit: "million people",
    source: "UN World Population Prospects",
    year: 2024,
    decimals: 0,
    note: "Mid-year population estimate, medium variant.",
  },
  {
    id: "gdp",
    name: "GDP",
    unit: "US$ trillion",
    source: "World Bank, World Development Indicators",
    year: 2024,
    decimals: 1,
    note: "Gross domestic product in current US dollars, nominal.",
  },
  {
    id: "gdpPerCapita",
    name: "GDP per capita",
    unit: "US$",
    source: "World Bank, World Development Indicators",
    year: 2024,
    decimals: 0,
    note: "Nominal GDP divided by mid-year population.",
  },
  {
    id: "lifeExpectancy",
    name: "Life expectancy",
    unit: "years",
    source: "World Bank, World Development Indicators",
    year: 2023,
    decimals: 1,
    note: "Life expectancy at birth, both sexes combined.",
  },
  {
    id: "medianAge",
    name: "Median age",
    unit: "years",
    source: "UN World Population Prospects",
    year: 2024,
    decimals: 1,
    note: "The age that divides the population into two equal halves.",
  },
  {
    id: "urbanShare",
    name: "Urban population",
    unit: "% of population",
    source: "World Bank, World Development Indicators",
    year: 2024,
    decimals: 0,
    note: "Share of people living in areas defined as urban.",
  },
];

export const COUNTRIES = [
  {
    code: "ind",
    name: "India",
    region: "South Asia",
    capital: "New Delhi",
    areaKm2: 3287263,
    note: "The world's most populous country since 2023.",
    values: { population: 1451, gdp: 3.9, gdpPerCapita: 2700, lifeExpectancy: 67.7, medianAge: 28.7, urbanShare: 36 },
  },
  {
    code: "chn",
    name: "China",
    region: "East Asia",
    capital: "Beijing",
    areaKm2: 9596961,
    note: "The world's second-largest economy by nominal GDP.",
    values: { population: 1419, gdp: 18.7, gdpPerCapita: 13200, lifeExpectancy: 78.7, medianAge: 39.7, urbanShare: 65 },
  },
  {
    code: "usa",
    name: "United States",
    region: "North America",
    capital: "Washington, D.C.",
    areaKm2: 9833517,
    note: "The world's largest economy by nominal GDP.",
    values: { population: 345, gdp: 29.2, gdpPerCapita: 85800, lifeExpectancy: 78.5, medianAge: 38.5, urbanShare: 83 },
  },
  {
    code: "idn",
    name: "Indonesia",
    region: "Southeast Asia",
    capital: "Jakarta",
    areaKm2: 1904569,
    note: "The world's largest island country by population.",
    values: { population: 284, gdp: 1.4, gdpPerCapita: 4900, lifeExpectancy: 71.0, medianAge: 30.6, urbanShare: 59 },
  },
  {
    code: "pak",
    name: "Pakistan",
    region: "South Asia",
    capital: "Islamabad",
    areaKm2: 881913,
    note: "More than a third of its people are under 15.",
    values: { population: 251, gdp: 0.4, gdpPerCapita: 1500, lifeExpectancy: 65.9, medianAge: 20.5, urbanShare: 38 },
  },
  {
    code: "nga",
    name: "Nigeria",
    region: "Africa",
    capital: "Abuja",
    areaKm2: 923768,
    note: "The youngest population in this atlas by median age.",
    values: { population: 233, gdp: 0.2, gdpPerCapita: 800, lifeExpectancy: 54.0, medianAge: 18.1, urbanShare: 53 },
  },
  {
    code: "bra",
    name: "Brazil",
    region: "South America",
    capital: "Brasília",
    areaKm2: 8515767,
    note: "The largest country in South America by area and population.",
    values: { population: 216, gdp: 2.2, gdpPerCapita: 10300, lifeExpectancy: 76.0, medianAge: 34.0, urbanShare: 87 },
  },
  {
    code: "bgd",
    name: "Bangladesh",
    region: "South Asia",
    capital: "Dhaka",
    areaKm2: 147570,
    note: "The most densely populated large country in this atlas.",
    values: { population: 174, gdp: 0.5, gdpPerCapita: 2600, lifeExpectancy: 73.2, medianAge: 27.0, urbanShare: 40 },
  },
  {
    code: "rus",
    name: "Russia",
    region: "Europe",
    capital: "Moscow",
    areaKm2: 17098242,
    note: "The largest country in the world by land area.",
    values: { population: 145, gdp: 2.1, gdpPerCapita: 14500, lifeExpectancy: 72.5, medianAge: 40.6, urbanShare: 75 },
  },
  {
    code: "mex",
    name: "Mexico",
    region: "North America",
    capital: "Mexico City",
    areaKm2: 1964375,
    note: "The largest Spanish-speaking country by population.",
    values: { population: 131, gdp: 1.8, gdpPerCapita: 13900, lifeExpectancy: 75.4, medianAge: 29.7, urbanShare: 81 },
  },
  {
    code: "jpn",
    name: "Japan",
    region: "East Asia",
    capital: "Tokyo",
    areaKm2: 377975,
    note: "The oldest population in this atlas by median age.",
    values: { population: 124, gdp: 4.0, gdpPerCapita: 32500, lifeExpectancy: 84.0, medianAge: 49.1, urbanShare: 92 },
  },
  {
    code: "deu",
    name: "Germany",
    region: "Europe",
    capital: "Berlin",
    areaKm2: 357588,
    note: "The largest economy in Europe by nominal GDP.",
    values: { population: 85, gdp: 4.7, gdpPerCapita: 55700, lifeExpectancy: 81.8, medianAge: 46.8, urbanShare: 77 },
  },
];

export function indicatorById(id) {
  return INDICATORS.find((entry) => entry.id === id) || null;
}

export function countryByCode(code) {
  return COUNTRIES.find((entry) => entry.code === code) || null;
}

export function rankOf(country, indicatorId) {
  const ordered = [...COUNTRIES].sort((a, b) => b.values[indicatorId] - a.values[indicatorId]);
  return ordered.findIndex((entry) => entry.code === country.code) + 1;
}

export function medianOf(indicatorId) {
  const sorted = COUNTRIES.map((entry) => entry.values[indicatorId]).sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function formatValue(indicator, value) {
  const shown = value.toLocaleString("en-US", {
    minimumFractionDigits: indicator.decimals,
    maximumFractionDigits: indicator.decimals,
  });
  return shown;
}

export function formatArea(areaKm2) {
  return areaKm2.toLocaleString("en-US") + " km²";
}
