// Optional learned weights. A later job writes data/weights.json. Until that file exists
// and is valid, the page keeps using the heuristic model and says why.
// Expected shape (format_version 1): { format_version, patch (string or null), generated_at
// (date string), stat_weights (non-empty numbers), champion_offsets (numbers, may be empty) }.
// Learned scoring is not applied yet, so the active model stays "heuristic" even when
// a valid file is present.

export const WEIGHTS_URL = 'data/weights.json';
export const WEIGHTS_FORMAT_VERSION = 1;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNumberMap(value) {
  return isPlainObject(value) && Object.values(value).every((x) => typeof x === 'number' && Number.isFinite(x));
}

/** @returns {string | null} A reason the data is unusable, or null when it is valid. */
export function validateWeights(data) {
  if (!isPlainObject(data)) return 'top level is not an object';
  if (data.format_version !== WEIGHTS_FORMAT_VERSION) {
    return `format_version must be ${WEIGHTS_FORMAT_VERSION}`;
  }
  if (!(data.patch === undefined || data.patch === null || typeof data.patch === 'string')) {
    return 'patch must be a string or null';
  }
  if (typeof data.generated_at !== 'string' || Number.isNaN(Date.parse(data.generated_at))) {
    return 'generated_at must be a date string';
  }
  if (!isNumberMap(data.stat_weights) || Object.keys(data.stat_weights).length === 0) {
    return 'stat_weights must be a non-empty object of numbers';
  }
  if (!isNumberMap(data.champion_offsets)) {
    return 'champion_offsets must be an object of numbers';
  }
  return null;
}

function heuristic(reason) {
  return { active: 'heuristic', reason, learned: null };
}

/**
 * Reads data/weights.json if it is there. Never throws: any failure becomes a reason.
 * @returns {Promise<{ active: 'heuristic', reason: string,
 *   learned: { patch: string | null, generatedAt: string } | null }>}
 */
export async function loadWeights(url = WEIGHTS_URL) {
  let response;
  try {
    response = await fetch(url);
  } catch {
    return heuristic('weights.json could not be fetched');
  }
  if (response.status === 404) return heuristic('no weights.json yet');
  if (!response.ok) return heuristic(`weights.json returned HTTP ${response.status}`);

  let data;
  try {
    data = await response.json();
  } catch {
    return heuristic('weights.json is not valid JSON');
  }
  const problem = validateWeights(data);
  if (problem) return heuristic(`weights.json rejected: ${problem}`);

  return {
    active: 'heuristic',
    reason: 'learned weights are available but not applied yet',
    learned: { patch: data.patch ?? null, generatedAt: data.generated_at },
  };
}
