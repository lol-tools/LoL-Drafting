// Heuristic drafting model. Pure functions, no DOM.
// This is the logic the old js/main.js ran. Predictions must stay identical, so keep the
// arithmetic and the evaluation order as they are. Learned weights (data/weights.json) are
// not used here yet.

export const EPS = 0.0559375;
export const COMP_PREFIX = 'CompScore';
export const COMP_PROPERTIES = ['Attack', 'Catch', 'Protect', 'Siege', 'Split'];
const COMP_KEYS = COMP_PROPERTIES.map((name) => COMP_PREFIX + name);
export const ROLES_SHORT = ['top', 'jg', 'mid', 'adc', 'supp'];
export const ROLES_LONG = ['Top', 'Jungle', 'Mid', 'ADC', 'Support'];

const SHORT_TO_LONG = Object.fromEntries(ROLES_SHORT.map((role, i) => [role, ROLES_LONG[i]]));
const LONG_TO_SHORT = Object.fromEntries(ROLES_LONG.map((role, i) => [role, ROLES_SHORT[i]]));

export function shortToLong(role) {
  return SHORT_TO_LONG[role] ?? role;
}

export function longToShort(role) {
  return LONG_TO_SHORT[role] ?? role;
}

// Row = counter relation: 2 hard counter, 1 soft counter, 0 same type, -1/-2 reversed.
const CHANCES_COW = [
  /*      A  C  P Si Sp*/
  /* A*/ [0, 1, 2, -2, -1],
  /* C*/ [-1, 0, 1, 2, -2],
  /* P*/ [-2, -1, 0, 1, 2],
  /*Si*/ [2, -2, -1, 0, 1],
  /*Sp*/ [1, 2, -2, -1, 0],
];

const CHANCES_RANDOMONIUM = [
  /*        A    C    P   Si   Sp*/
  /* A*/ [0.0, 0.62, 0.62, 0.19, 0.4],
  /* C*/ [0.38, 0.0, 0.5, 0.72, 0.17],
  /* P*/ [0.38, 0.5, 0.0, 0.81, 0.0],
  /*Si*/ [0.81, 0.28, 0.19, 0.0, 0.75],
  /*Sp*/ [0.6, 0.83, 1.0, 0.25, 0.0],
];

const COMP_INDEX = {
  CompScoreAttack: 0,
  CompScoreCatch: 1,
  CompScoreProtect: 2,
  CompScoreSiege: 3,
  CompScoreSplit: 4,
};

/**
 * Win chance for the first team's best comp against the second team's best comp.
 * @param {[string, number]} team1 [comp key, score]
 * @param {[string, number]} team2 [comp key, score]
 */
export function chance(team1, team2) {
  const indexBlue = COMP_INDEX[team1[0]];
  const indexRed = COMP_INDEX[team2[0]];
  const relation = CHANCES_COW[indexBlue][indexRed];
  if (relation === 0) {
    if (team1[1] == team2[1]) return 0.5;
    return team1[1] > team2[1] ? 1 : 0;
  }
  return CHANCES_RANDOMONIUM[indexBlue][indexRed];
}

function standardDeviation(values) {
  const n = values.length - 1;
  const mean = values.reduce((a, b) => a + b) / values.length;
  return Math.sqrt(values.map((x) => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n);
}

/**
 * Turns summed per-comp scores into the scores for one composition type.
 * @param {Record<string, number>} comp summed CompScore* values
 * @param {string} type composition type from the selector, e.g. "Ultimate 3"
 */
export function expandComps(comp, type) {
  const scores = {};
  for (const name of COMP_PROPERTIES) {
    if (type === name || type === 'Base 1') {
      scores[COMP_PREFIX + name] = comp[COMP_PREFIX + name];
    }
  }

  const last = type[type.length - 1];
  if (last === '2') {
    for (let i = 0; i < COMP_PROPERTIES.length; i += 1) {
      for (let j = i + 1; j < COMP_PROPERTIES.length; j += 1) {
        const key = `${COMP_PREFIX}${COMP_PROPERTIES[i]}+${COMP_PROPERTIES[j]}`;
        const a = comp[COMP_KEYS[i]];
        const b = comp[COMP_KEYS[j]];
        if (type === 'Ultimate 2') scores[key] = 3000 - standardDeviation([a, b]);
        if (type === 'Base 2') scores[key] = Math.min(a, b);
      }
    }
  }

  if (last === '3') {
    for (let i = 0; i < COMP_PROPERTIES.length; i += 1) {
      for (let j = i + 1; j < COMP_PROPERTIES.length; j += 1) {
        for (let k = j + 1; k < COMP_PROPERTIES.length; k += 1) {
          const key = `${COMP_PREFIX}${COMP_PROPERTIES[i]}+${COMP_PROPERTIES[j]}+${COMP_PROPERTIES[k]}`;
          const a = comp[COMP_KEYS[i]];
          const b = comp[COMP_KEYS[j]];
          const c = comp[COMP_KEYS[k]];
          if (type === 'Ultimate 3') scores[key] = 3000 - standardDeviation([a, b, c]);
          if (type === 'Base 3') scores[key] = Math.min(a, b, c);
        }
      }
    }
  }

  if (type === 'Balance') {
    scores[COMP_PREFIX + 'Balance'] = 3000 - standardDeviation(COMP_KEYS.map((key) => comp[key]));
  }
  return scores;
}

/**
 * Sums a team's comp scores (plus an optional extra champion) and expands them for `type`.
 * @param {object | undefined} suggestion extra champion row, or undefined
 * @param {object[]} team champion rows on the team
 * @param {string} type composition type
 */
export function scoreChampionInComp(suggestion, team, type) {
  const rows = JSON.parse(JSON.stringify(team));
  if (suggestion !== undefined) rows.push(suggestion);
  const sums = Object.fromEntries(COMP_KEYS.map((key) => [key, 0]));
  for (const row of rows) {
    for (const key of COMP_KEYS) sums[key] += row[key];
  }
  return expandComps(sums, type);
}

/** Team rows with a champion picked (the placeholder row has an empty name). */
export function pickedRows(teamRows) {
  return Object.values(teamRows).filter((row) => row.Champion.length != 0);
}

/**
 * Suggestion candidates per team and role: [name, score, compTypeLabel].
 * @param {object} args
 * @param {Record<string, object>} args.championData keyed by tag, '' placeholder included
 * @param {object[][]} args.compTeams picked rows for team 0 and team 1
 * @param {Record<string, Record<string, number>>[]} args.roleFilter per team: name -> short role -> weight
 * @param {string} args.compType
 */
export function buildSuggestions({ championData, compTeams, roleFilter, compType }) {
  const raw = [{}, {}];
  for (const team of [0, 1]) {
    raw[team] = Object.fromEntries(ROLES_LONG.map((role) => [role, []]));
  }

  for (const team of [0, 1]) {
    for (const tag of Object.keys(championData)) {
      const championName = championData[tag].Champion;
      if (championName.length == 0) continue;
      const row = championData[tag];
      for (const role of ROLES_LONG) {
        raw[team][role].push([
          championName,
          scoreChampionInComp(row, compTeams[team], compType),
          roleFilter[team][championName][longToShort(role)],
        ]);
      }
    }
  }

  const result = [{}, {}];
  for (const team of [0, 1]) {
    for (const role of ROLES_LONG) {
      result[team][role] = raw[team][role].map(([championName, scores, weight]) => {
        const maxCompScore = Math.max(...Object.values(scores));
        const score = (maxCompScore * weight) / 10;
        const compType = Object.keys(scores)
          .filter((comp) => scores[comp] == maxCompScore)
          .map((name) => name.slice(COMP_PREFIX.length).split('+').join('/'))
          .join('<br>');
        return [championName, score, compType];
      });
    }
  }
  return result;
}

/** Drops zero-score candidates and sorts each list from highest score down. */
export function rankSuggestions(suggestions) {
  const ranked = [{}, {}];
  for (const team of [0, 1]) {
    for (const role of ROLES_LONG) {
      ranked[team][role] = suggestions[team][role]
        .filter((a) => a[1] > 0)
        .sort((a, b) => -a[1] + b[1]);
    }
  }
  return ranked;
}

/** Top-5 comp breakdown for both teams, plus chart values (scaled by 5). */
export function analysisData(compTeam1, compTeam2) {
  const scores1 = scoreChampionInComp(undefined, compTeam1, 'Base 1');
  const scores2 = scoreChampionInComp(undefined, compTeam2, 'Base 1');
  return {
    chart1: Object.entries(scores1).map((a) => [a[0], (a[1] / compTeam1.length) * 5]),
    chart2: Object.entries(scores2).map((a) => [a[0], (a[1] / compTeam2.length) * 5]),
    top1: Object.entries(scores1)
      .sort((a, b) => b[1] - a[1])
      .map((a) => [a[0], a[1] / compTeam1.length]),
    top2: Object.entries(scores2)
      .sort((a, b) => b[1] - a[1])
      .map((a) => [a[0], a[1] / compTeam2.length]),
  };
}

function topThreeBaseScores(compTeam) {
  return Object.entries(scoreChampionInComp(undefined, compTeam, 'Base 1'))
    .sort((a, b) => b[1] - a[1])
    .map((a) => [a[0], a[1] / compTeam.length])
    .slice(0, 3);
}

/**
 * Win probability for team 1 and the call. winner: 1 or 2, or -1 for no call (inside EPS).
 * @returns {{ calc: number, winner: 1 | 2 | -1 }}
 */
export function predictWinner(compTeam1, compTeam2) {
  if (compTeam1.length == 0 && compTeam2.length == 0) return { calc: 0.5, winner: -1 };
  if (compTeam1.length == 0) return { calc: 0, winner: 2 };
  if (compTeam2.length == 0) return { calc: 1, winner: 1 };

  const data1 = topThreeBaseScores(compTeam1);
  const data2 = topThreeBaseScores(compTeam2);
  let calc = 0;
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      calc += chance(data1[i], data2[j]);
    }
  }
  calc /= 9;

  const winner = calc < 0.5 - EPS ? 2 : calc > 0.5 + EPS ? 1 : -1;
  return { calc, winner };
}

/** Status per team: 'winner' / 'loser', or '50' for both when there is no call. */
export function statusForWinner(winner) {
  const status = [];
  if (winner !== -1) {
    status[winner - 1] = 'winner';
    status[2 - winner] = 'loser';
  } else {
    status[0] = status[1] = '50';
  }
  return status;
}

/** Per-role and team-total scaling differences (team 0 minus team 1), rounded to 2 dp. */
export function scalingDiffs(teams) {
  const roles = Object.keys(teams[0]);
  const diff = (role, key) => teams[0][role][key] - teams[1][role][key];
  const round2 = (value) => Math.round(value * 100) / 100;
  const perRole = {};
  for (const role of roles) {
    perRole[role] = {
      early: round2(diff(role, 'WRScoreEarly')),
      mid: round2(diff(role, 'WRScoreMid')),
      late: round2(diff(role, 'WRScoreLate')),
    };
  }
  const total = (key) => round2(roles.map((role) => diff(role, key)).reduce((sum, val) => sum + val, 0));
  return {
    perRole,
    team: { early: total('WRScoreEarly'), mid: total('WRScoreMid'), late: total('WRScoreLate') },
  };
}
