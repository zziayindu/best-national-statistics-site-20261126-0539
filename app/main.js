// StatAtlas boot: hash router, page rendering and control wiring.
// State for the list and compare pages lives here in memory; the hash only
// names the page, so every page is reached by a link.

import {
  viewCompare,
  viewCountries,
  viewCountry,
  viewHome,
  viewIndicators,
  viewSources,
} from "./views.js";

const app = document.getElementById("app");

const state = {
  sort: "population",
  query: "",
  codes: ["ind", "chn", "usa"],
};

function route() {
  const hash = window.location.hash || "#/";
  const path = hash.slice(1);
  const parts = path.split("/").filter((part) => part.length > 0);
  if (parts.length === 0) return { page: "home" };
  if (parts[0] === "countries") return { page: "countries" };
  if (parts[0] === "country" && parts[1]) return { page: "country", code: parts[1] };
  if (parts[0] === "compare") return { page: "compare" };
  if (parts[0] === "indicators") return { page: "indicators" };
  if (parts[0] === "sources") return { page: "sources" };
  return { page: "home" };
}

function render() {
  const current = route();
  let html = "";
  if (current.page === "home") html = viewHome();
  else if (current.page === "countries") html = viewCountries(state);
  else if (current.page === "country") html = viewCountry(current.code);
  else if (current.page === "compare") html = viewCompare(state);
  else if (current.page === "indicators") html = viewIndicators();
  else if (current.page === "sources") html = viewSources();
  app.innerHTML = html;
  document.title = titleFor(current);
  wireControls(current);
  window.scrollTo(0, 0);
}

function titleFor(current) {
  if (current.page === "countries") return "All countries · StatAtlas";
  if (current.page === "country") return `Country · StatAtlas`;
  if (current.page === "compare") return "Compare countries · StatAtlas";
  if (current.page === "indicators") return "Indicator rankings · StatAtlas";
  if (current.page === "sources") return "Sources & method · StatAtlas";
  return "StatAtlas — National Statistics Explorer";
}

function wireControls(current) {
  if (current.page === "countries") {
    const sort = document.getElementById("sort-select");
    const search = document.getElementById("search-input");
    if (sort) {
      sort.addEventListener("change", () => {
        state.sort = sort.value;
        render();
      });
    }
    if (search) {
      search.addEventListener("input", () => {
        state.query = search.value;
        render();
        const again = document.getElementById("search-input");
        if (again) {
          again.focus();
          again.setSelectionRange(again.value.length, again.value.length);
        }
      });
    }
  }
  if (current.page === "compare") {
    document.querySelectorAll("[data-compare]").forEach((select) => {
      select.addEventListener("change", () => {
        state.codes[Number(select.dataset.compare)] = select.value;
        render();
      });
    });
  }
}

window.addEventListener("hashchange", render);
render();
