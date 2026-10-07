// Shared helpers: CSV loading, theme colours, Chart.js defaults.

// Minimal CSV parser (handles quoted fields containing commas).
function parseCSV(text) {
  const rows = [];
  for (const line of text.trim().split(/\r?\n/)) {
    const cells = [];
    let cur = '', quoted = false;
    for (const ch of line) {
      if (ch === '"') quoted = !quoted;
      else if (ch === ',' && !quoted) { cells.push(cur); cur = ''; }
      else cur += ch;
    }
    cells.push(cur);
    rows.push(cells);
  }
  const head = rows.shift();
  return rows.map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

async function loadCSV(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`);
  return parseCSV(await res.text());
}

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`);
  return res.json();
}

// Read a colour token from the stylesheet so charts follow light/dark mode.
function token(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function chartDefaults() {
  if (!window.Chart) return;
  Chart.defaults.font.family = '"Public Sans", "Segoe UI", system-ui, sans-serif';
  Chart.defaults.font.size = 13;
  Chart.defaults.color = token('--ink-soft');
  Chart.defaults.borderColor = token('--rule');
  Chart.defaults.plugins.legend.labels.boxWidth = 14;
  Chart.defaults.maintainAspectRatio = false;
}

// Show a plain message inside a figure if its data fails to load.
function figureError(el, err) {
  if (!el) return;
  const p = document.createElement('p');
  p.style.cssText = 'font-family:var(--sans);font-size:.9rem';
  p.textContent = `This chart needs its data file. ${err.message}. If you opened the file directly, run a local server instead (see README).`;
  el.replaceChildren(p);
}
