// Champion icons from Riot's Data Dragon CDN, read at runtime (nothing is bundled).
// Icons are decoration: any failure resolves to an empty map and the page shows names only.

import { tagFor } from './data.js';

const VERSIONS_URL = 'https://ddragon.leagueoflegends.com/api/versions.json';
const CDN_ROOT = 'https://ddragon.leagueoflegends.com/cdn';

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} failed: HTTP ${response.status}`);
  return response.json();
}

/**
 * Maps each champion tag (the value the selects use) to its square icon URL, for the
 * latest Data Dragon version. Never rejects.
 * @returns {Promise<Map<string, string>>}
 */
export async function loadChampionIcons() {
  try {
    const [latest] = await fetchJson(VERSIONS_URL);
    const { data } = await fetchJson(`${CDN_ROOT}/${latest}/data/en_US/champion.json`);
    return new Map(
      Object.values(data).map((champion) => [
        tagFor(champion.id),
        `${CDN_ROOT}/${latest}/img/champion/${champion.image.full}`,
      ]),
    );
  } catch (error) {
    console.warn('Champion icons unavailable, showing names only.', error);
    return new Map();
  }
}
