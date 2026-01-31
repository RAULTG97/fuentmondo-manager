import axios from 'axios';
import { CONFIG } from '../config';

const api = axios.create({
    baseURL: import.meta.env.PROD ? 'https://api.futmondo.com/external/kong' : '/api',
    params: {
        apiKey: CONFIG.API_KEY
    }
});

// Add response interceptor to handle errors or unwrap "answer" if needed
api.interceptors.response.use(
    (response) => {
        if (response.data && response.data.answer) {
            return response.data.answer;
        }
        return response.data;
    },
    (error) => {
        const errorMsg = error.response?.data?.message || error.message;
        console.error(`[API ERROR] ${errorMsg}`);
        return Promise.reject(error);
    }
);

const internalApi = axios.create({
    baseURL: import.meta.env.PROD ? 'https://api.futmondo.com' : '/internal-api',
    headers: {
        'Content-Type': 'application/json',
        // 'Origin' is unsafe to set in browser (refused by Chrome). 
        // We only set it in Dev (where proxy adds it) or if we were server-side.
        // In Prod (GH Pages), we can't spoof it.
    }
});

import { apiCache } from '../utils/apiCache';

const internalPost = (endpoint, query) => {

    return internalApi.post(endpoint, {
        header: {
            token: CONFIG.INTERNAL_TOKEN,
            userid: CONFIG.INTERNAL_USER_ID
        },
        query: query,
        answer: {}
    }).then(res => res.data.answer);
};

// CACHE WRAPPERS

export const getInternalRounds = async (championshipId, userteamId) => {
    const key = `rounds_${championshipId}_${userteamId}`;
    const cached = apiCache.get(key);
    if (cached) return cached;

    const data = await internalPost('/1/userteam/rounds', { championshipId, userteamId });
    apiCache.set(key, data, 60 * 60 * 1000); // 1 hour TTL
    return data;
};

export const getInternalRankingRound = async (championshipId, roundNumber, isLive = false) => {
    const key = `ranking_${championshipId}_${roundNumber}`;
    // If isLive, bypass cache GET, or check if we have a very recent one?
    // User wants real-time for live rounds. 
    // Let's rely on cache ONLY if it's NOT live, or if it is live but very fresh (handled by shorter TTL set below)

    if (!isLive) {
        const cached = apiCache.get(key);
        if (cached) return cached;
    }

    const data = await internalPost('/1/ranking/round', { championshipId, roundNumber, roundId: roundNumber });

    // Dynamic TTL
    const ttl = isLive ? 60 * 1000 : 24 * 60 * 60 * 1000; // 1 min for live, 24 hours for past
    apiCache.set(key, data, ttl);
    return data;
};

export const getInternalLineup = async (championshipId, userteamId, roundId, isLive = false) => {
    const key = `lineup_${championshipId}_${userteamId}_${roundId}`;

    if (!isLive) {
        const cached = apiCache.get(key);
        if (cached) return cached;
    }

    const data = await internalPost('/1/userteam/roundlineup', { championshipId, userteamId, round: roundId });

    const ttl = isLive ? 30 * 1000 : 24 * 60 * 60 * 1000; // 30s for live lineup, 24h for past
    apiCache.set(key, data, ttl);
    return data;
};

export const getInternalCup = async (championshipId) => {
    const key = `cup_${championshipId}`;
    const cached = apiCache.get(key);
    if (cached) return cached;

    const data = await internalPost('/5/cup/get', { championshipId });
    // Normalize data if needed, or just return
    return data;
};

export const getInternalUserteam = async (championshipId, userteamId) => {
    const key = `userteam_${championshipId}_${userteamId}`;
    const cached = apiCache.get(key);
    if (cached) return cached;

    // Use /1/userteam/get or similar if available/needed. 
    // For now assuming we might not need it or it's not described. 
    // But we might need player's club info. 
    // Usually lineup has player info including club.
    return null;
};

export const getInternalRankingMatches = async (championshipId, isLive = false) => {
    const key = `matches_${championshipId}`;

    if (!isLive) {
        const cached = apiCache.get(key);
        if (cached) return cached;
    }

    const data = await internalPost('/5/ranking/matches', { championshipId });

    const ttl = isLive ? 60 * 1000 : 60 * 60 * 1000; // 1 min live, 1 hour otherwise
    apiCache.set(key, data, ttl);
    return data;
};

// External methods
export const getChampionships = () => Promise.resolve({
    data: CONFIG.CHAMPIONSHIPS
});

// ... other external methods remain valid for listing
export const getLeagueMatches = (league) => api.get('/league/matches', { params: { league } });

export default api;
