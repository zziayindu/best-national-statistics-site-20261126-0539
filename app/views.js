// StatAtlas views: one function per page. Every page is built from the
// site's own data; nothing here is a placeholder and every control works.

import {
  COUNTRIES,
  INDICATORS,
  countryByCode,
  formatArea,
  formatValue,
  indicatorById,
  medianOf,
  rankOf,
} from "./data.js";
import { barChart, groupedBarChart } from "./charts.js";

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sourceLine(indicator) {
  return `Source: ${escapeHtml(indicator.source)}, ${indicator.year}`;
}

function indicatorCard(country, indicator) {
  const value = country.values[indicator.id];
  const rank = rankOf(country, indicator.id);
  const median = medianOf(indicator.id);
  return (
    `<div class="stat-card">` +
    `<div class="stat-name">${escapeHtml(indicator.name)}</div>` +
    `<div class="stat-value">${formatValue(indicator, value)} <span class="stat-unit">${escapeHtml(indicator.unit)}</span></div>` +
    `<div class="stat-meta">Rank ${rank} of ${COUNTRIES.length} · median ${formatValue(indicator, median)} ${escapeHtml(indicator.unit)}</div>` +
    `<div class="stat-source">${sourceLine(indicator)}</div>` +
    `</div>`
  );
}

function countryCard(country) {
  const pop = indicatorById("population");
  const gdp = indicatorById("gdp");
  const life = indicatorById("lifeExpectancy");
  return (
    `<a class="country-card" href="#/country/${country.code}">` +
    `<div class="country-name">${escapeHtml(country.name)}</div>` +
    `<div class="country-region">${escapeHtml(country.region)} · capital ${escapeHtml(country.capital)}</div>` +
    `<div class="country-figures">` +
    `<span><b>${formatValue(pop, country.values.population)}</b> million people</span>` +
    `<span><b>$${formatValue(gdp, country.values.gdp)}tn</b> GDP</span>` +
    `<span><b>${formatValue(life, country.values.lifeExpectancy)}</b> years life expectancy</span>` +
    `</div>` +
    `<div class="country-note">${escapeHtml(country.note)}</div>` +
    `</a>`
  );
}

export function viewHome() {
  const pop = indicatorById("population");
  const topPop = [...COUNTRIES].sort((a, b) => b.values.population - a.values.population).slice(0, 6);
  const chartRows = topPop.map((country) => ({
    label: country.name,
    value: country.values.population,
    display: formatValue(pop, country.values.population) + "m",
    highlight: country.code === "ind",
  }));
  const totalPop = COUNTRIES.reduce((sum, country) => sum + country.values.population, 0);
  return (
    `<section class="hero">` +
    `<h1>StatAtlas</h1>` +
    `<p class="hero-sub">National statistics for the world's 12 most populous countries, ` +
    `in one place. Every figure carries its source and year.</p>` +
    `<p class="hero-numbers"><b>12</b> countries · <b>6</b> indicators · <b>72</b> figures, each with source &amp; year · ` +
    `<b>${totalPop.toLocaleString("en-US")}</b> million people covered</p>` +
    `<p class="hero-links"><a class="button" href="#/countries">Browse all countries</a> ` +
    `<a class="button secondary" href="#/compare">Compare countries</a> ` +
    `<a class="button secondary" href="#/indicators">Indicator rankings</a></p>` +
    `</section>` +
    `<section class="panel">` +
    `<h2>Most populous countries, 2024</h2>` +
    `${barChart(chartRows, { ariaLabel: "Bar chart of the six most populous countries in 2024" })}` +
    `<p class="source-note">${sourceLine(pop)} · Figures rounded to the nearest million.</p>` +
    `</section>` +
    `<section class="panel">` +
    `<h2>All 12 countries</h2>` +
    `<div class="card-grid">${COUNTRIES.map(countryCard).join("")}</div>` +
    `</section>` +
    `<section class="panel">` +
    `<h2>What you can do here</h2>` +
    `<ul class="feature-list">` +
    `<li><a href="#/countries">Sort and search</a> all 12 countries by any indicator.</li>` +
    `<li><a href="#/compare">Compare up to three countries</a> side by side on every indicator.</li>` +
    `<li><a href="#/indicators">Rank every country</a> on population, GDP, life expectancy and more.</li>` +
    `<li><a href="#/sources">Check every source</a>: where each figure comes from, and what is rounded.</li>` +
    `</ul>` +
    `</section>`
  );
}

export function viewCountries(state) {
  const sortId = state.sort || "population";
  const query = (state.query || "").toLowerCase();
  const indicator = indicatorById(sortId) || indicatorById("population");
  const listed = COUNTRIES.filter((country) => country.name.toLowerCase().includes(query)).sort(
    (a, b) => b.values[indicator.id] - a.values[indicator.id],
  );
  const options = INDICATORS.map(
    (entry) =>
      `<option value="${entry.id}"${entry.id === indicator.id ? " selected" : ""}>${escapeHtml(entry.name)}</option>`,
  ).join("");
  const rows = listed
    .map(
      (country, index) =>
        `<tr><td>${index + 1}</td>` +
        `<td><a href="#/country/${country.code}">${escapeHtml(country.name)}</a></td>` +
        `<td>${escapeHtml(country.region)}</td>` +
        `<td class="num">${formatValue(indicator, country.values[indicator.id])}</td>` +
        `<td class="num">${formatValue(indicatorById("gdpPerCapita"), country.values.gdpPerCapita)}</td>` +
        `<td class="num">${formatValue(indicatorById("lifeExpectancy"), country.values.lifeExpectancy)}</td></tr>`,
    )
    .join("");
  return (
    `<section class="panel">` +
    `<h1>All countries</h1>` +
    `<p>${COUNTRIES.length} countries, sorted by the indicator you pick. ` +
    `GDP per capita and life expectancy are shown for every row so the table stays comparable.</p>` +
    `<div class="controls">` +
    `<label>Sort by <select id="sort-select">${options}</select></label>` +
    `<label>Search <input id="search-input" type="search" placeholder="Type a country name" value="${escapeHtml(state.query || "")}"></label>` +
    `</div>` +
    `<table class="data-table"><thead><tr><th>#</th><th>Country</th><th>Region</th>` +
    `<th class="num">${escapeHtml(indicator.name)} (${escapeHtml(indicator.unit)})</th>` +
    `<th class="num">GDP per capita (US$)</th><th class="num">Life expectancy (years)</th></tr></thead>` +
    `<tbody>${rows || `<tr><td colspan="6">No country matches “${escapeHtml(state.query || "")}”. Try another name.</td></tr>`}</tbody></table>` +
    `<p class="source-note">${sourceLine(indicator)} · GDP per capita: World Bank, 2024 · Life expectancy: World Bank, 2023.</p>` +
    `</section>`
  );
}

export function viewCountry(code) {
  const country = countryByCode(code);
  if (!country) {
    return `<section class="panel"><h1>Country not found</h1><p>There is no country with the code “${escapeHtml(code)}” in this atlas. <a href="#/countries">Browse all 12 countries</a>.</p></section>`;
  }
  const pop = indicatorById("population");
  const topPop = [...COUNTRIES].sort((a, b) => b.values.population - a.values.population).slice(0, 6);
  const chartRows = topPop.map((entry) => ({
    label: entry.name,
    value: entry.values.population,
    display: formatValue(pop, entry.values.population) + "m",
    highlight: entry.code === country.code,
  }));
  const ranks = INDICATORS.map((indicator) => {
    const rank = rankOf(country, indicator.id);
    return `<li>${escapeHtml(indicator.name)}: <b>rank ${rank} of ${COUNTRIES.length}</b> — ${formatValue(indicator, country.values[indicator.id])} ${escapeHtml(indicator.unit)}</li>`;
  }).join("");
  return (
    `<section class="panel">` +
    `<p class="breadcrumb"><a href="#/countries">All countries</a> / ${escapeHtml(country.name)}</p>` +
    `<h1>${escapeHtml(country.name)}</h1>` +
    `<p class="country-facts">${escapeHtml(country.region)} · Capital: ${escapeHtml(country.capital)} · Area: ${formatArea(country.areaKm2)} · ${escapeHtml(country.note)}</p>` +
    `<div class="stat-grid">${INDICATORS.map((indicator) => indicatorCard(country, indicator)).join("")}</div>` +
    `</section>` +
    `<section class="panel">` +
    `<h2>Population in context, 2024</h2>` +
    `<p>${escapeHtml(country.name)} is highlighted among the six most populous countries.</p>` +
    `${barChart(chartRows, { ariaLabel: `Bar chart of the six most populous countries in 2024, ${country.name} highlighted` })}` +
    `<p class="source-note">${sourceLine(pop)}.</p>` +
    `</section>` +
    `<section class="panel">` +
    `<h2>Where ${escapeHtml(country.name)} stands</h2>` +
    `<ul class="rank-list">${ranks}</ul>` +
    `<p><a href="#/compare">Compare ${escapeHtml(country.name)} with other countries</a> · <a href="#/sources">How these figures were compiled</a></p>` +
    `</section>`
  );
}

export function viewCompare(state) {
  const codes = (state.codes || ["ind", "chn", "usa"]).slice(0, 3);
  while (codes.length < 3) codes.push(COUNTRIES[codes.length].code);
  const picked = codes.map((code) => countryByCode(code) || COUNTRIES[0]);
  const selects = [0, 1, 2]
    .map(
      (index) =>
        `<label>Country ${index + 1} <select data-compare="${index}">` +
        COUNTRIES.map(
          (entry) =>
            `<option value="${entry.code}"${entry.code === picked[index].code ? " selected" : ""}>${escapeHtml(entry.name)}</option>`,
        ).join("") +
        `</select></label>`,
    )
    .join("");
  const groups = INDICATORS.map((indicator) => ({
    label: indicator.name,
    values: picked.map((country) => ({
      name: country.name,
      value: country.values[indicator.id],
      display: formatValue(indicator, country.values[indicator.id]),
    })),
  }));
  const tableRows = INDICATORS.map((indicator) => {
    const cells = picked
      .map(
        (country) =>
          `<td class="num">${formatValue(indicator, country.values[indicator.id])} <span class="rank-tag">rank ${rankOf(country, indicator.id)}</span></td>`,
      )
      .join("");
    return `<tr><th scope="row">${escapeHtml(indicator.name)} <span class="unit-tag">${escapeHtml(indicator.unit)} · ${indicator.year}</span></th>${cells}</tr>`;
  }).join("");
  const headers = picked.map((country) => `<th class="num"><a href="#/country/${country.code}">${escapeHtml(country.name)}</a></th>`).join("");
  return (
    `<section class="panel">` +
    `<h1>Compare countries</h1>` +
    `<p>Pick up to three countries. Each chart group scales to its own largest value, ` +
    `so indicators with different units can be compared at a glance; the table below gives the exact figures.</p>` +
    `<div class="controls">${selects}</div>` +
    `${groupedBarChart(groups, { ariaLabel: "Comparison chart of the three selected countries across six indicators" })}` +
    `</section>` +
    `<section class="panel">` +
    `<h2>Figures side by side</h2>` +
    `<table class="data-table"><thead><tr><th>Indicator</th>${headers}</tr></thead><tbody>${tableRows}</tbody></table>` +
    `<p class="source-note">Sources: UN World Population Prospects 2024 (population, median age); World Bank, World Development Indicators 2024 (GDP, GDP per capita, urban population) and 2023 (life expectancy). Figures rounded as shown.</p>` +
    `</section>`
  );
}

export function viewIndicators() {
  const sections = INDICATORS.map((indicator) => {
    const ordered = [...COUNTRIES].sort((a, b) => b.values[indicator.id] - a.values[indicator.id]);
    const rows = ordered
      .map(
        (country, index) =>
          `<tr><td>${index + 1}</td><td><a href="#/country/${country.code}">${escapeHtml(country.name)}</a></td>` +
          `<td class="num">${formatValue(indicator, country.values[indicator.id])}</td></tr>`,
      )
      .join("");
    return (
      `<section class="panel">` +
      `<h2>${escapeHtml(indicator.name)}</h2>` +
      `<p>${escapeHtml(indicator.note)} Unit: ${escapeHtml(indicator.unit)}. ${sourceLine(indicator)}.</p>` +
      `<table class="data-table"><thead><tr><th>#</th><th>Country</th><th class="num">${escapeHtml(indicator.name)} (${escapeHtml(indicator.unit)})</th></tr></thead><tbody>${rows}</tbody></table>` +
      `</section>`
    );
  }).join("");
  return (
    `<section class="panel"><h1>Indicator rankings</h1>` +
    `<p>Every country in this atlas, ranked on each of the six indicators. ` +
    `The median of the 12 is shown on each country's page for context.</p></section>` + sections
  );
}

export function viewSources() {
  return (
    `<section class="panel"><h1>Sources &amp; method</h1>` +
    `<p>StatAtlas covers 12 countries — the 12 most populous in the world — on 6 indicators, ` +
    `72 figures in total. Every figure on this site names its source and year where it appears; this page says how they were put together.</p>` +
    `<h2>Sources used</h2>` +
    `<ul class="source-list">` +
    `<li><b>UN World Population Prospects 2024</b> — population and median age (2024, medium variant).</li>` +
    `<li><b>World Bank, World Development Indicators</b> — GDP and GDP per capita (2024, current US$), urban population share (2024), life expectancy (2023).</li>` +
    `</ul>` +
    `<h2>Rounding and honesty</h2>` +
    `<ul class="source-list">` +
    `<li>Figures are rounded to the unit shown (population to the nearest million, GDP to the nearest $0.1 trillion, life expectancy and median age to one decimal). Small differences from other compilations are expected.</li>` +
    `<li>Life expectancy is 2023, not 2024, because the World Bank's 2024 value was not published for every country here when this atlas was compiled. The year is printed next to the figure wherever it appears.</li>` +
    `<li>Ranks are out of the 12 countries in this atlas, not out of all countries in the world.</li>` +
    `<li>Capitals and land areas are the commonly listed values; area is shown to the nearest km².</li>` +
    `</ul>` +
    `<h2>What is not here</h2>` +
    `<ul class="source-list">` +
    `<li>Only 12 countries are covered. A country outside the 12 most populous is not in this atlas yet.</li>` +
    `<li>There are no time series: each indicator shows the latest available year only.</li>` +
    `<li>Nothing on this site is fetched from the network. All figures are in the site's own files, so it works offline.</li>` +
    `</ul>` +
    `<p>Built as an original site for the make.fun best national statistics site bounty. ` +
    `StatAtlas is not affiliated with the United Nations or the World Bank.</p>` +
    `</section>`
  );
}
