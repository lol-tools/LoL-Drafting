// DOM rendering. Writes the same cells, ids and state classes the old page used
// ('winner', 'loser', '50', 'picked', 'open'). All text goes in through textContent.

import { COMP_PREFIX, EPS, ROLES_LONG, ROLES_SHORT, longToShort } from './model.js';
import { tagFor } from './data.js';
import { getColorByNumber } from './utils.js';

const STATE_CLASSES = ['winner', 'loser', '50'];
const PHASES = ['early', 'mid', 'late'];
const TOP_N = 5;
const MODEL_NAMES = { heuristic: 'Heuristic', learned: 'Learned' };
const SUGGESTION_ICON_PX = 18;

let chart = null;
let lastAnalysis = null;

const byId = (id) => document.getElementById(id);
const classNames = (...names) => names.filter(Boolean).join(' ');

function cell(tag, { text, className, attrs = {} } = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * Comp labels are joined with "<br>" by the model. Build real <br> elements, no innerHTML.
 * A <wbr> after each "/" lets long labels wrap. It adds no text, so textContent is unchanged.
 */
function appendLabel(node, label) {
  label.split('<br>').forEach((line, index) => {
    if (index > 0) node.append(document.createElement('br'));
    line.split('/').forEach((segment, i) => {
      if (i > 0) {
        node.append('/');
        node.append(document.createElement('wbr'));
      }
      node.append(segment);
    });
  });
  return node;
}

/** Decorative champion icon. It is removed if the image fails, so the name stays on its own. */
function championIcon(url, size) {
  const img = document.createElement('img');
  img.className = 'champ-icon';
  img.alt = '';
  img.width = size;
  img.height = size;
  img.decoding = 'async';
  img.src = url;
  img.addEventListener('error', () => img.remove());
  return img;
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
 * Board icon beside each champion select. The slot keeps its width when a champion is
 * missing, so the selects do not move.
 * @param {Map<string, string>} icons champion tag -> icon URL
 */
export function renderBoardIcons(icons) {
  for (const select of document.querySelectorAll('select.select_champion')) {
    const img = select.closest('.champ-field').querySelector('.champ-icon');
    const url = icons.get(select.value);
    if (!url) {
      img.removeAttribute('src');
    } else if (img.getAttribute('src') !== url) {
      img.onerror = () => img.removeAttribute('src');
      img.src = url;
    }
  }
}

/** 'picked' wins over 'open', which marks the top five per role. */
function suggestionState(name, rowIndex, pickedNames) {
  if (pickedNames.has(name)) return 'picked';
  return rowIndex < TOP_N ? 'open' : '';
}

function pickChip(name, team, role, icons) {
  const pick = cell('button', {
    text: name,
    className: 'pick-chip',
    attrs: { type: 'button', 'data-tag': tagFor(name), 'data-team': team, 'data-role': role },
  });
  const url = icons.get(tagFor(name));
  if (url) pick.prepend(championIcon(url, SUGGESTION_ICON_PX));
  return pick;
}

/**
 * Suggestion table. Cell order and state classes match the old page. A spacer column
 * separates the two teams, and labels and scores carry their own classes.
 * @param {{ ranked: Array<Record<string, Array<[string, number, string]>>>, showScores: boolean,
 *   pickedNames: Set<string>, icons: Map<string, string> }} args
 */
export function renderSuggestions({ ranked, showScores, pickedNames, icons }) {
  const maxRows = Math.max(0, ...ROLES_LONG.flatMap((role) => [ranked[0][role].length, ranked[1][role].length]));
  const rows = [];

  for (let i = 0; i < maxRows; i += 1) {
    const row = document.createElement('tr');
    for (let team = 0; team < 2; team += 1) {
      if (team === 1) row.append(cell('td', { className: 'team-gap', attrs: { 'aria-hidden': 'true' } }));
      for (const role of ROLES_LONG) {
        const list = ranked[team][role];
        if (list.length > i) {
          const [name, score, label] = list[i];
          const state = suggestionState(name, i, pickedNames);
          const nameCell = cell('td', {
            className: classNames(state, 'suggestion-name'),
            attrs: { colspan: showScores ? 1 : 2 },
          });
          nameCell.append(pickChip(name, team, longToShort(role), icons));
          row.append(nameCell);
          row.append(appendLabel(cell('td', { className: classNames(state, 'suggestion-label') }), label));
          if (showScores) row.append(cell('td', { text: score.toFixed(2), className: 'suggestion-score' }));
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
  node.querySelector('[data-model-name]').textContent = MODEL_NAMES[status.active] ?? status.active;
  node.querySelector('[data-model-detail]').textContent = describeStatus(status);
  node.dataset.state = status.learned ? 'learned-pending' : 'heuristic';
}

function describeStatus(status) {
  if (!status.learned) {
    return `Heuristic model in use. ${capitalize(status.reason)}.`;
  }
  const { patch, generatedAt } = status.learned;
  const which = patch ? `patch ${patch}` : 'an unknown patch';
  return `Heuristic model in use. Learned weights for ${which}, generated ${generatedAt}, are available but not applied yet.`;
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
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
