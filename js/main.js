// Entry point. Connects the page controls to the model and renders the results.
// Predictions come from js/model.js and are unchanged. Learned weights are reported only.

import { loadChampionTables, parseTeamFile } from './data.js';
import { loadWeights } from './weights.js';
import {
  ROLES_SHORT,
  analysisData,
  buildSuggestions,
  pickedRows,
  predictWinner,
  rankSuggestions,
  scalingDiffs,
  shortToLong,
  statusForWinner,
} from './model.js';
import {
  renderAnalysis,
  renderDiffs,
  renderModelStatus,
  renderStatus,
  renderSuggestions,
  setBusy,
  showError,
  watchColorScheme,
} from './render.js';

const byId = (id) => document.getElementById(id);
const TEAMS = [0, 1];

const state = {
  tables: null, // from loadChampionTables()
  teams: [{}, {}], // role -> champion row, or the empty placeholder row
  comfort: {}, // player -> champion -> value; shared by both teams, as on the old page
};

function championSelects() {
  return document.querySelectorAll('select.select_champion');
}

function playerSelects() {
  return document.querySelectorAll('select.select_player');
}

function populateChampionSelects(options) {
  for (const select of championSelects()) {
    const list = [new Option('', '')];
    for (const { tag, name } of options) list.push(new Option(name, tag));
    select.replaceChildren(...list);
  }
}

function pickedNames() {
  return new Set(TEAMS.flatMap((team) => Object.values(state.teams[team]).map((row) => row.Champion)));
}

function refresh() {
  const { championData, roleFilter } = state.tables;
  renderDiffs(scalingDiffs(state.teams));

  const compTeams = TEAMS.map((team) => pickedRows(state.teams[team]));
  const compType = byId('comp_type').value;
  const ranked = rankSuggestions(buildSuggestions({ championData, compTeams, roleFilter, compType }));
  renderSuggestions({ ranked, showScores: byId('math').checked, pickedNames: pickedNames() });

  renderAnalysis(analysisData(compTeams[0], compTeams[1]));
  const { calc, winner } = predictWinner(compTeams[0], compTeams[1]);
  renderStatus(calc, statusForWinner(winner));
}

/** Uses the player's comfort for this role, as the old page did. */
function applyPlayer(team, role, player) {
  const { championData, roleFilter, meta } = state.tables;
  const longRole = shortToLong(role);
  for (const tag of Object.keys(championData)) {
    if (tag.length > 0) {
      const name = championData[tag].Champion;
      roleFilter[team][name][role] = Math.pow(meta[team][longRole][name], 2) * state.comfort[player][name];
    }
  }
}

function onChampionChange(select) {
  const team = Number(select.dataset.team);
  state.teams[team][select.dataset.role] = state.tables.championData[select.value];
  refresh();
}

function onPlayerChange(select) {
  applyPlayer(Number(select.dataset.team), select.dataset.role, select.value);
  refresh();
}

async function onTeamFile(team, file) {
  if (!file) return;
  setBusy(true, 'Reading team file');
  try {
    const { players, comfort, meta } = parseTeamFile(await file.text());
    state.comfort = comfort;
    state.tables.meta[team] = meta;
    for (const role of ROLES_SHORT) {
      const select = byId(`team${team + 1}_${role}_player`);
      select.replaceChildren(...players.map((player) => new Option(player, player)));
      if (players.length > 0) applyPlayer(team, role, select.value);
    }
    refresh();
  } catch (error) {
    console.error(error);
    showError(`Could not read that team file: ${error.message}`);
  } finally {
    setBusy(false);
  }
}

function resetPicks() {
  for (const select of championSelects()) select.value = '';
  for (const team of TEAMS) {
    for (const role of ROLES_SHORT) state.teams[team][role] = state.tables.placeholder;
  }
  refresh();
}

function randomPicks() {
  const champs = Object.keys(state.tables.championData).length;
  for (const select of championSelects()) {
    select.selectedIndex = Math.floor(Math.random() * champs) + 1;
    onChampionChange(select);
  }
}

function onSuggestionClick(event) {
  const target = event.target.closest('[data-tag]');
  if (!target) return;
  const select = byId(`team${Number(target.dataset.team) + 1}_${target.dataset.role}_champion`);
  select.value = target.dataset.tag;
  onChampionChange(select);
}

function bindControls() {
  for (const select of championSelects()) {
    select.addEventListener('change', () => onChampionChange(select));
  }
  for (const select of playerSelects()) {
    select.addEventListener('change', () => onPlayerChange(select));
  }
  for (const input of document.querySelectorAll('input[type=file][data-team]')) {
    input.addEventListener('change', (event) => onTeamFile(Number(input.dataset.team), event.target.files.item(0)));
  }
  byId('comp_type').addEventListener('change', refresh);
  byId('math').addEventListener('change', refresh);
  byId('reset').addEventListener('click', resetPicks);
  byId('test').addEventListener('click', randomPicks);
  byId('suggestions').addEventListener('click', onSuggestionClick);
  watchColorScheme();
}

async function init() {
  const weights = loadWeights();
  setBusy(true, 'Loading champion data');
  try {
    state.tables = await loadChampionTables();
    state.teams = TEAMS.map(() =>
      Object.fromEntries(ROLES_SHORT.map((role) => [role, state.tables.placeholder])),
    );
    populateChampionSelects(state.tables.options);
    bindControls();
    refresh();
  } catch (error) {
    console.error(error);
    showError(`Champion data failed to load: ${error.message}`);
  } finally {
    setBusy(false);
  }
  renderModelStatus(await weights);
}

init();
