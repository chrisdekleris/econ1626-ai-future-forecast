// Visual 3: diffusion simulator. Visual 4: growth calculator.
//
// Engine (see docs/methods.md):
//   adoption(t) = 1 / (1 + exp(-k (t - t50)))   logistic S-curve, k set so adoption(2025) = 11%
//   level(t)    = task_gain * exposed_share * adoption(t)   Hulten: share of work affected x saving
//   average annual uplift 2025-35 = (1 + level(2035))^(1/10) - 1

let params = null;
let simChart = null;
let calcChart = null;

const YEARS = Array.from({ length: 11 }, (_, i) => 2025 + i); // 2025..2035

function adoption(t, t50, a0, t0) {
  const k = Math.log(1 / a0 - 1) / (t50 - t0);
  return 1 / (1 + Math.exp(-k * (t - t50)));
}

function runModel(t50, taskGain) {
  const { start_adoption: a0, start_year: t0, exposed_share: share } = params;
  const adopt = YEARS.map(t => adoption(t, t50, a0, t0));
  const level = adopt.map(a => taskGain * share * a);
  const avgUplift = (Math.pow(1 + level[level.length - 1], 1 / 10) - 1) * 100;
  return { adopt, level, avgUplift };
}

function readSliders() {
  return {
    t50: Number(document.getElementById('s-t50').value),
    gain: Number(document.getElementById('s-gain').value) / 100
  };
}

function setSliders(t50, gain) {
  document.getElementById('s-t50').value = t50;
  document.getElementById('s-gain').value = Math.round(gain * 100);
}

function updateSim() {
  const { t50, gain } = readSliders();
  document.getElementById('o-t50').textContent = t50;
  document.getElementById('o-gain').textContent = `${Math.round(gain * 100)}%`;
  const m = runModel(t50, gain);
  simChart.data.datasets[0].data = m.adopt.map(a => +(a * 100).toFixed(1));
  simChart.data.datasets[1].data = m.level.map(l => +(l * 100).toFixed(2));
  simChart.update();
  document.getElementById('r-2030').textContent = `${(m.adopt[5] * 100).toFixed(0)}%`;
  document.getElementById('r-level').textContent = `${(m.level[10] * 100).toFixed(1)}%`;
  document.getElementById('r-uplift').textContent = `${m.avgUplift.toFixed(2)} pp`;
}

function pressScenario(group, key) {
  document.querySelectorAll(`#${group} button`).forEach(b => b.setAttribute('aria-pressed', b.dataset.s === key));
}

function buildSimulator() {
  const el = document.getElementById('chart-sim');
  simChart = new Chart(el, {
    type: 'line',
    data: {
      labels: YEARS,
      datasets: [
        { label: 'Small firms using AI (%)', data: [], borderColor: token('--wattle'), backgroundColor: token('--wattle'), yAxisID: 'y', tension: 0.3, pointRadius: 0, borderWidth: 3 },
        { label: 'Productivity level gain (%)', data: [], borderColor: token('--eucalypt'), backgroundColor: token('--eucalypt'), yAxisID: 'y2', tension: 0.3, pointRadius: 0, borderWidth: 3 }
      ]
    },
    options: {
      interaction: { mode: 'index', intersect: false },
      scales: {
        y: { min: 0, max: 100, title: { display: true, text: 'Small firms using AI (%)' } },
        y2: { position: 'right', min: 0, max: 12, grid: { drawOnChartArea: false }, title: { display: true, text: 'Productivity gain (%)' } },
        x: { grid: { display: false } }
      }
    }
  });
  document.querySelectorAll('#sim-scenarios button').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = params.scenarios[btn.dataset.s];
      setSliders(s.t50, s.task_gain);
      pressScenario('sim-scenarios', btn.dataset.s);
      updateSim();
    });
  });
  ['s-t50', 's-gain'].forEach(id => document.getElementById(id).addEventListener('input', () => {
    pressScenario('sim-scenarios', null);
    updateSim();
  }));
  const b = params.scenarios.baseline;
  setSliders(b.t50, b.task_gain);
  pressScenario('sim-scenarios', 'baseline');
  updateSim();
}

// ---------- Visual 4: GDP per person relative to a no-AI path ----------
function buildCalculator() {
  const el = document.getElementById('chart-calc');
  if (!el) return;
  const years = Array.from({ length: 21 }, (_, i) => 2025 + i); // 2025..2045
  const path = u => years.map((_, i) => +(100 * Math.pow(1 + u / 100, i)).toFixed(2));
  const sc = params.scenarios;
  calcChart = new Chart(el, {
    type: 'line',
    data: {
      labels: years,
      datasets: [
        { label: `Upside (${sc.upside.calculator_uplift_pp} pp)`, data: path(sc.upside.calculator_uplift_pp), borderColor: token('--wattle'), pointRadius: 0, borderWidth: 3 },
        { label: `Baseline (${sc.baseline.calculator_uplift_pp} pp)`, data: path(sc.baseline.calculator_uplift_pp), borderColor: token('--eucalypt'), pointRadius: 0, borderWidth: 3 },
        { label: `Downside (${sc.downside.calculator_uplift_pp} pp)`, data: path(sc.downside.calculator_uplift_pp), borderColor: token('--plum'), pointRadius: 0, borderWidth: 3 },
        { label: 'Your setting', data: path(0.5), borderColor: token('--ink'), borderDash: [5, 4], pointRadius: 0, borderWidth: 2 },
        { label: 'No AI', data: path(0), borderColor: token('--slate'), pointRadius: 0, borderWidth: 1.5 }
      ]
    },
    options: {
      interaction: { mode: 'index', intersect: false },
      plugins: { tooltip: { callbacks: { label: c => `${c.dataset.label}: ${c.raw}` } } },
      scales: { y: { min: 98, title: { display: true, text: 'GDP per person (2025 = 100)' } }, x: { grid: { display: false }, ticks: { maxTicksLimit: 6 } } }
    }
  });
  const slider = document.getElementById('s-uplift');
  const update = () => {
    const u = Number(slider.value);
    document.getElementById('o-uplift').textContent = `${u.toFixed(2)} pp`;
    calcChart.data.datasets[3].data = path(u);
    calcChart.update();
    document.getElementById('r-2045').textContent = `${((Math.pow(1 + u / 100, 20) - 1) * 100).toFixed(1)}%`;
  };
  slider.addEventListener('input', update);
  update();
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!document.getElementById('chart-sim')) return; // section not on the page yet
  try {
    params = await loadJSON('data/scenarios.json');
    buildSimulator();
    buildCalculator();
  } catch (e) {
    figureError(document.getElementById('chart-sim').parentElement, e);
    figureError(document.getElementById('chart-calc').parentElement, e);
  }
});
