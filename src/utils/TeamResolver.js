/**
 * Utility for resolving and normalizing team names across different data sources.
 */

export const normalizeName = (name) => {
    if (!name) return '';
    return name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        // Comprehensive emoji removal using unicode property escapes (requires 'u' flag)
        .replace(/[^\p{L}\p{N}\p{P}\p{Z}^$]/gu, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
};

const TEAM_REDIRECTS = {
    'huevitos bailarines f.c': 'real bailarines f.c',
    'cangrena f.c.': 'lim hijo de puta'
};

/**
 * Resolves a team name to its canonical normalized form for cross-referencing.
 */
export const resolveTeamName = (name) => {
    const norm = normalizeName(name);
    return TEAM_REDIRECTS[norm] || norm;
};
