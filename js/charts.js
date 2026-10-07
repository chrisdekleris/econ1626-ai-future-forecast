// Hero dots and the three data charts: estimate strip, adoption by firm size, data-centre power.

// ---------- Hero: 100 dots per firm size, lit at the ABS adoption rate ----------
function buildHero() {
  const rows = document.querySelectorAll('.tail-row');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  rows.forEach(row => {
    const pct = Number(row.dataset.pct);
    const box = row.querySelector('.dots');
    const dots = [];
    for (let i = 0; i < 100; i++) {
      const d = document.createElement('span');
      d.className = 'dot';
      box.appendChild(d);
      dots.push(d);
    }
    // One orchestrated moment: the adopters light up in sequence.
    dots.slice(0, pct).forEach((d, i) => {
      if (reduce) d.classList.add('on');
      else setTimeout(() => d.classList.add('on'), 400 + i * 28);
    });
  });
}

// ---------- Visual 1: the estimate strip ----------
async function buildEstimates() {
  const el = document.getElementById('chart-estimates');
  if (!el) return; // section not on the page yet
  try {
    const rows = await loadCSV('data/estimates.csv');
    const colours = { 'TFP': token('--slate'), 'MFP': token('--eucalypt'), 'Labour productivity': token('--wattle') };
    new Chart(el, {
      type: 'bar',
      data: {
        labels: rows.map(r => r.label),
        datasets: [{
          // Floating bars; single-point estimates get a minimum visible width.
          data: rows.map(r => [Number(r.low_pp), Math.max(Number(r.high_pp), Number(r.low_pp) + 0.02)]),
          backgroundColor: rows.map(r => colours[r.measure]),
          borderRadius: 3,
          barThickness: 22
        }]
      },
      options: {
        indexAxis: 'y',
        layout: { padding: { left: 10 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => {
                const r = rows[ctx.dataIndex];
                const range = r.low_pp === r.high_pp ? `${r.low_pp} pp a year` : `${r.low_pp} to ${r.high_pp} pp a year`;
                return [`${range} (${r.measure})`, `Source: ${r.source}`, r.note];
              }
            }
          }
        },
        scales: {
          x: { min: 0, max: 1.4, title: { display: true, text: 'Extra productivity growth from AI, percentage points per year' } },
          y: { grid: { display: false } }
        }
      }
    });
  } catch (e) { figureError(el.parentElement, e); }
}

// ---------- Visual 2: who is actually using it ----------
async function buildAdoption() {
  const el = document.getElementById('chart-adoption');
  if (!el) return; // section not on the page yet
  try {
    const rows = await loadCSV('data/abs-adoption.csv');
    const get = (g, y) => { const r = rows.find(x => x.group === g && x.year === y); return r ? Number(r.share_pct) : null; };
    const views = {
      size: {
        labels: ['Large', 'Medium', 'Small and micro'],
        datasets: [
          { label: '2021–22', data: [get('Large', '2021-22'), get('Medium', '2021-22'), null], backgroundColor: token('--slate') },
          { label: '2024–25', data: [get('Large', '2024-25'), get('Medium', '2024-25'), get('Small and micro', '2024-25')], backgroundColor: token('--wattle') }
        ]
      },
      innovation: {
        labels: ['Large', 'Medium', 'Small', 'Micro'],
        datasets: [
          { label: 'Innovation-active', data: ['Large', 'Medium', 'Small', 'Micro'].map(s => get(`${s}: innovation-active`, '2024-25')), backgroundColor: token('--eucalypt') },
          { label: 'Not innovation-active', data: ['Large', 'Medium', 'Small', 'Micro'].map(s => get(`${s}: not innovation-active`, '2024-25')), backgroundColor: token('--slate') }
        ]
      }
    };
    const chart = new Chart(el, {
      type: 'bar',
      data: structuredClone(views.size),
      options: {
        plugins: { tooltip: { callbacks: { label: c => `${c.dataset.label}: ${c.raw}% of businesses (ABS 2026)` } } },
        scales: { y: { min: 0, max: 40, title: { display: true, text: 'Businesses using AI (%)' } }, x: { grid: { display: false } } }
      }
    });
    document.querySelectorAll('#adoption-toggle button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#adoption-toggle button').forEach(b => b.setAttribute('aria-pressed', b === btn));
        chart.data = structuredClone(views[btn.dataset.view]);
        chart.update();
      });
    });
  } catch (e) { figureError(el.parentElement, e); }
}

// ---------- Visual 5: the power line ----------
async function buildPower() {
  const el = document.getElementById('chart-power');
  if (!el) return; // section not on the page yet
  try {
    const rows = await loadCSV('data/aemo-datacentres.csv');
    const pts = key => rows.filter(r => r[key]).map(r => ({ x: Number(r.year), y: Number(r[key]) }));
    const high = [{ x: 2030, y: 15 }, ...pts('high_twh').filter(p => p.x > 2030)];
    new Chart(el, {
      type: 'line',
      data: {
        datasets: [
          { label: 'Central forecast', data: pts('central_twh'), borderColor: token('--eucalypt'), backgroundColor: token('--eucalypt'), pointRadius: 5, tension: 0 },
          { label: 'High growth case (2035–36)', data: high, borderColor: token('--plum'), backgroundColor: token('--plum'), borderDash: [6, 4], pointRadius: 5, tension: 0 }
        ]
      },
      options: {
        parsing: false,
        plugins: { tooltip: { callbacks: { label: c => `${c.dataset.label}: about ${c.raw.y} TWh` } } },
        scales: {
          x: { type: 'linear', min: 2025, max: 2037, ticks: { stepSize: 1, callback: v => (v === 2030 ? '2029–30' : v === 2036 ? '2035–36' : v) } },
          y: { min: 0, title: { display: true, text: 'Data-centre electricity use (TWh a year)' } }
        }
      }
    });
  } catch (e) { figureError(el.parentElement, e); }
}

document.addEventListener('DOMContentLoaded', () => {
  chartDefaults();
  buildHero();
  buildEstimates();
  buildAdoption();
  buildPower();
});
