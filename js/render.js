// DOM rendering. Writes the same cells, ids and state classes the old page used
// ('winner', 'loser', '50', 'picked', 'open'). All text goes in through textContent.

import { COMP_PREFIX, EPS, ROLES_LONG, ROLES_SHORT, longToShort } from './model.js';
import { tagFor } from './data.js';
import { getColorByNumber } from './utils.js';

const STATE_CLASSES = ['winner', 'loser', '50'];
const PHASES = ['early', 'mid', 'late'];
const TOP_N = 5;
const MODEL_NAMES = { heuristic: 'Heuristic', learned: 'Learned' };

let chart = null;
let lastAnalysis = null;

const byId = (id) => document.getElementById(id);

function cell(tag, { text, className, attrs = {} } = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Comp labels are joined with "<br>" by the model. Build real <br> elements, no innerHTML. */
function appendLabel(node, label) {
  label.split('<br>').forEach((part, index) => {
    if (index > 0) node.append(document.createElement('br'));
    node.append(part);
  });
  return node;
}

function setDiff(id, value) {
  const node = byId(id);
  node.textContent = value.toFixed(2);
  node.style.backgroundColor = getColorByNumber(value, -100, 100);
}

/** @param {{ perRole: Record<string, Record<string, number>>, team: Record<string, number> }} diffs */
export function renderDiffs({ perRole, team }) {
  for (const role of ROLES_SHORT) {
    for (const phase of PHASES) setDiff(`game_${role}_diff_${phase}`, perRole[role][phase]);
  }
  for (const phase of PHASES) setDiff(`game_team_diff_${phase}`, team[phase]);
}

function setStateClass(node, stateClass) {
  node.classList.remove(...STATE_CLASSES);
  node.classList.add(stateClass);
}

/**
 * @param {number} calc team 1 win chance
 * @param {string[]} status 'winner' / 'loser' / '50' per team
 */
export function renderStatus(calc, status) {
  for (let team = 0; team < 2; team += 1) {
    const percentage = team === 0 ? calc : 1 - calc;
    for (const role of ROLES_SHORT) {
      setStateClass(byId(`team${team + 1}_${role}_champion`).closest('td'), status[team]);
    }
    const node = byId(`team${team + 1}_status`);
    setStateClass(node, status[team]);
    node.textContent = `${status[team]} / ${Math.round(percentage * 1000) / 10}%`;
  }
  byId('eps').textContent = `eps = ${Math.round(EPS * 10000000) / 100000}%`;
}

/**
 * Suggestion table. Cell order and classes match the old page.
 * @param {{ ranked: Array<Record<string, Array<[string, number, string]>>>, showScores: boolean,
 *   pickedNames: Set<string> }} args
 */
export function renderSuggestions({ ranked, showScores, pickedNames }) {
  const maxRows = Math.max(0, ...ROLES_LONG.flatMap((role) => [ranked[0][role].length, ranked[1][role].length]));
  const rows = [];

  for (let i = 0; i < maxRows; i += 1) {
    const row = document.createElement('tr');
    for (let team = 0; team < 2; team += 1) {
      for (const role of ROLES_LONG) {
        const list = ranked[team][role];
        if (list.length > i) {
          const [name, score, label] = list[i];
          let className = '';
          if (pickedNames.has(name)) className = 'picked';
          else if (i < TOP_N) className = 'open';
          const pick = cell('button', {
            text: name,
            className: 'pick-chip',
            attrs: { type: 'button', 'data-tag': tagFor(name), 'data-team': team, 'data-role': longToShort(role) },
          });
          const nameCell = cell('td', { className, attrs: { colspan: showScores ? 1 : 2 } });
          nameCell.append(pick);
          row.append(nameCell);
          row.append(appendLabel(cell('td', { className }), label));
          if (showScores) row.append(cell('td', { text: score.toFixed(2) }));
        }
        if (list.length === i) {
          row.append(cell('td', { attrs: { colspan: 3, rowspan: maxRows - list.length } }));
        }
      }
    }
    rows.push(row);
  }
  byId('suggestions').replaceChildren(...rows);
}

/** Top-5 comp breakdown table and radar chart. */
export function renderAnalysis(analysis) {
  lastAnalysis = analysis;
  const rows = [];
  for (let i = 0; i < TOP_N; i += 1) {
    const [name1, value1] = analysis.top1[i];
    const [name2, value2] = analysis.top2[i];
    const row = document.createElement('tr');
    row.append(
      cell('td', { text: String(i + 1) }),
      cell('td', { text: name1.slice(COMP_PREFIX.length) }),
      cell('td', { text: String(value1) }),
      cell('td', { text: name2.slice(COMP_PREFIX.length) }),
      cell('td', { text: String(value2) }),
    );
    rows.push(row);
  }
  byId('analysis').replaceChildren(...rows);
  renderRadar();
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function chartColors() {
  return {
    text: cssVar('--chart-text'),
    grid: cssVar('--chart-grid'),
    surface: cssVar('--chart-surface'),
    team1: cssVar('--team-you'),
    team1Soft: cssVar('--team-you-soft'),
    team2: cssVar('--team-them'),
    team2Soft: cssVar('--team-them-soft'),
    compLabels: ['--comp-attack', '--comp-catch', '--comp-protect', '--comp-siege', '--comp-split'].map(cssVar),
  };
}

function surfacePlugin(color) {
  return {
    id: 'surface-fill',
    beforeDraw(instance) {
      const ctx = instance.canvas.getContext('2d');
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, instance.width, instance.height);
      ctx.restore();
    },
  };
}

function datasetFor(label, values, soft, strong, surface) {
  return {
    label,
    data: values,
    fill: true,
    backgroundColor: soft,
    borderColor: strong,
    pointBackgroundColor: strong,
    pointBorderColor: surface,
    pointHoverBackgroundColor: surface,
    pointHoverBorderColor: strong,
  };
}

/**
 * Rebuilt on every analysis and on colour-scheme changes, because Chart.js does not
 * read CSS variables by itself.
 */
export function renderRadar() {
  if (!lastAnalysis || !globalThis.Chart) return;
  const colors = chartColors();
  chart?.destroy();
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  chart = new globalThis.Chart(byId('myChart'), {
    type: 'radar',
    data: {
      labels: lastAnalysis.chart1.map((x) => x[0].slice(COMP_PREFIX.length)),
      datasets: [
        datasetFor('Your team', lastAnalysis.chart1.map((x) => x[1]), colors.team1Soft, colors.team1, colors.surface),
        datasetFor('Enemy team', lastAnalysis.chart2.map((x) => x[1]), colors.team2Soft, colors.team2, colors.surface),
      ],
    },
    options: {
      animation: reduceMotion ? false : { animateScale: true, animateRotate: true },
      elements: { line: { borderWidth: 2 } },
      scales: {
        r: {
          angleLines: { display: false },
          suggestedMin: 1000,
          suggestedMax: 3000,
          pointLabels: { font: { size: 13 }, color: colors.compLabels },
          grid: { color: colors.grid, lineWidth: 1 },
          ticks: { maxTicksLimit: 50, display: false },
        },
      },
      plugins: {
        legend: { labels: { color: colors.text, font: { size: 13 } } },
      },
    },
    plugins: [surfacePlugin(colors.surface)],
  });
}

/** @param {{ active: string, reason: string, learned: { patch: string | null, generatedAt: string } | null }} status */
export function renderModelStatus(status) {
  const node = byId('model-status');
  const patch = status.learned?.patch ? `patch ${status.learned.patch}` : 'no patch tag';
  node.querySelector('[data-model-name]').textContent = MODEL_NAMES[status.active] ?? status.active;
  node.querySelector('[data-model-detail]').textContent = `${patch}. ${status.reason}.`;
  node.dataset.state = status.learned ? 'learned-pending' : 'heuristic';
}

export function setBusy(isBusy, label = '') {
  document.body.toggleAttribute('data-busy', isBusy);
  byId('busy-label').textContent = isBusy ? label : '';
}

export function showError(message) {
  const notice = byId('error');
  notice.textContent = message;
  notice.hidden = false;
}

/** Re-renders the chart when the system colour scheme changes. */
export function watchColorScheme() {
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => renderRadar());
}
