// Loads the champion tables and builds the lookup structures the model reads.
// Logic and key names follow the old js/main.js init() exactly.

import { parseTsv } from './parse-tsv.js';
import { ROLES_LONG, ROLES_SHORT, shortToLong } from './model.js';

const SCORES_URL = 'data/champ_scores.tsv';
const ROLES_URL = 'data/champion_roles.tsv';

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} failed: HTTP ${response.status}`);
  return response.text();
}

function hasName(row) {
  return row.Champion.length != 0;
}

/** Lower-case letters only, with Wukong stored under its old tag "monkeyking". */
export function tagFor(championName) {
  const tag = championName
    .toLowerCase()
    .split('')
    .filter((x) => 'a' <= x && x <= 'z')
    .join('');
  return tag == 'wukong' ? 'monkeyking' : tag;
}

function emptyRoleMeta() {
  return Object.fromEntries(ROLES_LONG.map((role) => [role, {}]));
}

/**
 * Builds the placeholder row used for an empty slot. Its stats are the averages of
 * every champion, the same as the old page computed.
 */
function buildPlaceholder(championList) {
  const placeholder = { Champion: '' };
  for (const attr of Object.keys(championList[0])) {
    if (attr != 'Champion') {
      placeholder[attr] =
        championList.map((x) => x[attr]).reduce((sum, value) => sum + value, 0) / championList.length;
    }
  }
  placeholder.WRScoreEarly = 33.3;
  placeholder.WRScoreMid = 33.3;
  placeholder.WRScoreLate = 33.3;
  return placeholder;
}

/**
 * @returns {Promise<{ championData: object, options: {tag: string, name: string}[],
 *   placeholder: object, meta: Record<string, Record<string, number>>[],
 *   roleFilter: Record<string, Record<string, number>>[] }>}
 */
export async function loadChampionTables() {
  const [scoresText, rolesText] = await Promise.all([fetchText(SCORES_URL), fetchText(ROLES_URL)]);

  const championList = parseTsv(scoresText).filter(hasName);
  const championData = championList.reduce((obj, champion) => {
    obj[tagFor(champion.Champion)] = champion;
    return obj;
  }, {});
  const options = championList.map((champion) => ({
    tag: tagFor(champion.Champion),
    name: champion.Champion,
  }));
  const placeholder = buildPlaceholder(championList);
  championData[''] = placeholder;

  const roleList = parseTsv(rolesText).filter(hasName);
  const meta = [emptyRoleMeta(), emptyRoleMeta()];
  for (const champion of roleList) {
    for (const role of Object.keys(champion)) {
      if (role == 'Champion') continue;
      meta[0][role][champion.Champion] = meta[1][role][champion.Champion] = champion[role];
    }
  }

  const roleFilter = [{}, {}];
  for (const champion of roleList) {
    for (const team of [0, 1]) {
      roleFilter[team][champion.Champion] = {};
      for (const role of ROLES_SHORT) {
        roleFilter[team][champion.Champion][role] =
          3 * Math.pow(meta[team][shortToLong(role)][champion.Champion], 2);
      }
    }
  }

  return { championData, options, placeholder, meta, roleFilter };
}

/**
 * Reads a team file: first column is the champion, middle columns are players,
 * last five are the roles (Top, Jungle, Mid, ADC, Support).
 * @returns {{ players: string[], comfort: Record<string, Record<string, number>>,
 *   meta: Record<string, Record<string, number>> }}
 */
export function parseTeamFile(text) {
  const data = parseTsv(text).filter(hasName);
  const headers = Object.keys(data[0]);
  const players = headers.slice(1, -5);

  const comfort = {};
  for (const player of players) {
    comfort[player] = {};
    for (const row of data) comfort[player][row.Champion] = row[player];
  }

  const teamMeta = emptyRoleMeta();
  for (const role of ROLES_LONG) {
    for (const row of data) teamMeta[role][row.Champion] = row[role];
  }

  return { players, comfort, meta: teamMeta };
}
