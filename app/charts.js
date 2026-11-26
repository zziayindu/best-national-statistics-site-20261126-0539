// StatAtlas charts: small SVG bar charts drawn from the site's own data.
// No chart library is used, so the first load stays light and the charts
// are part of the page, not pictures of it.

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// A horizontal bar chart: rows of { label, value, display, highlight }.
// The longest bar fills the track; every bar shows its value at the end.
export function barChart(rows, options = {}) {
  const width = options.width || 640;
  const rowHeight = options.rowHeight || 34;
  const labelWidth = options.labelWidth || 110;
  const valueWidth = options.valueWidth || 96;
  const height = rows.length * rowHeight + 8;
  const trackX = labelWidth;
  const trackWidth = width - labelWidth - valueWidth;
  const max = Math.max(...rows.map((row) => row.value), 1);
  const bars = rows
    .map((row, index) => {
      const y = 8 + index * rowHeight;
      const barWidth = Math.max(2, (row.value / max) * trackWidth);
      const fill = row.highlight ? "#0b6e4f" : "#2e7fa8";
      return (
        `<text x="0" y="${y + 15}" class="chart-label">${escapeHtml(row.label)}</text>` +
        `<rect x="${trackX}" y="${y}" width="${barWidth}" height="20" rx="3" fill="${fill}"></rect>` +
        `<text x="${trackX + barWidth + 8}" y="${y + 15}" class="chart-value">${escapeHtml(row.display)}</text>`
      );
    })
    .join("");
  return (
    `<svg class="chart" viewBox="0 0 ${width} ${height}" width="100%" role="img" ` +
    `aria-label="${escapeHtml(options.ariaLabel || "Bar chart")}">` +
    bars +
    `</svg>`
  );
}

// A grouped comparison chart: one group per indicator, one bar per country.
// Each group scales to its own largest value, so indicators with different
// units can share one chart. groups: { label, values: [{ name, value, display }] }.
export function groupedBarChart(groups, options = {}) {
  const width = options.width || 640;
  const barHeight = 16;
  const barGap = 4;
  const labelWidth = options.labelWidth || 130;
  const valueWidth = options.valueWidth || 90;
  const colors = ["#0b6e4f", "#2e7fa8", "#c96a1b"];
  let y = 28;
  const parts = [];
  const names = groups[0].values.map((entry) => entry.name);
  parts.push(
    names
      .map(
        (name, index) =>
          `<rect x="${labelWidth + 8 + index * 110}" y="4" width="12" height="12" fill="${colors[index % colors.length]}"></rect>` +
          `<text x="${labelWidth + 24 + index * 110}" y="15" class="chart-legend">${escapeHtml(name)}</text>`,
      )
      .join(""),
  );
  for (const group of groups) {
    const max = Math.max(...group.values.map((entry) => entry.value), 1);
    const trackWidth = width - labelWidth - valueWidth;
    parts.push(`<text x="0" y="${y + 12}" class="chart-label">${escapeHtml(group.label)}</text>`);
    group.values.forEach((entry, index) => {
      const barY = y + index * (barHeight + barGap);
      const barWidth = Math.max(2, (entry.value / max) * trackWidth);
      parts.push(
        `<rect x="${labelWidth}" y="${barY}" width="${barWidth}" height="${barHeight}" rx="3" fill="${colors[index % colors.length]}"></rect>` +
          `<text x="${labelWidth + barWidth + 8}" y="${barY + 12}" class="chart-value">${escapeHtml(entry.display)}</text>`,
      );
    });
    y += group.values.length * (barHeight + barGap) + 12;
  }
  return (
    `<svg class="chart" viewBox="0 0 ${width} ${y + 4}" width="100%" role="img" ` +
    `aria-label="${escapeHtml(options.ariaLabel || "Comparison chart")}">` +
    parts.join("") +
    `</svg>`
  );
}
