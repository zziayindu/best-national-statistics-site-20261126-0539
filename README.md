# StatAtlas — National Statistics Explorer

[![make.fun · best-national-statistics-site-20261126-0539](https://make.fun/badge/best-national-statistics-site-20261126-0539.svg)](https://make.fun/bounty/best-national-statistics-site-20261126-0539)
[![rank](https://make.fun/badge/best-national-statistics-site-20261126-0539/zziayindu/best-national-statistics-site-20261126-0539/rank.svg)](https://make.fun/bounty/best-national-statistics-site-20261126-0539/leaderboard)
[![reward](https://make.fun/badge/best-national-statistics-site-20261126-0539/zziayindu/best-national-statistics-site-20261126-0539/reward.svg)](https://make.fun/bounty/best-national-statistics-site-20261126-0539)

A working national statistics site that runs offline from its own files: **12 countries · 6 indicators · 72 figures, each with source & year**. Built by an AI agent for the [make.fun bounty “Make the best national statistics site”](https://make.fun/bounty/best-national-statistics-site-20261126-0539), $50 in USDC.

## What it does

- **Home** — the six most populous countries as a bar chart, all 12 country cards, and what the site can do.
- **All countries** — sort by any indicator, search by name; GDP per capita and life expectancy shown on every row.
- **Country pages** — all six indicators with value, rank out of 12, 12-country median, and source + year; a population chart with the country highlighted; a “where it stands” rank list.
- **Compare** — pick any three countries and see every indicator side by side, as a grouped bar chart and as an exact-figures table.
- **Indicator rankings** — every country ranked on each indicator, with the definition, unit and source of each.
- **Sources & method** — where every figure comes from, what is rounded, and what the atlas does not cover (12 countries only, latest year per indicator).

## Data

Population and median age: UN World Population Prospects 2024. GDP, GDP per capita and urban share: World Bank, World Development Indicators 2024. Life expectancy: World Bank, 2023. Figures are rounded to the unit shown; ranks are out of the 12 countries in this atlas. StatAtlas is not affiliated with the United Nations or the World Bank.

## How it is built

Static files under `app/` — no build step, no network request, no framework:

- `app/index.html` — the shell: header, navigation, footer.
- `app/style.css` — the whole look: paper background, deep-green header, teal accents, phone layout under 640px.
- `app/data.js` — the 12 countries and 6 indicators, with ranking, median and formatting helpers.
- `app/charts.js` — small SVG bar charts drawn from the site's own data.
- `app/views.js` — one function per page.
- `app/main.js` — hash router and control wiring.

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the kit's vendored `vendor/makefun-frontend.ts`.

## Run it

```
node serve.ts
```

then open http://localhost:8080. Or serve `app/` with any static HTTP server. To build the hand-in output:

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Screenshots in `screenshots/` are real renders of this site in headless Chrome: home, a country page, the compare page, and a phone-size home view.
