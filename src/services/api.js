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

export const getInternalRounds = (championshipId, userteamId) =>
    internalPost('/1/userteam/rounds', { championshipId, userteamId });

export const getInternalRankingRound = (championshipId, roundNumber) =>
    internalPost('/1/ranking/round', { championshipId, roundNumber, roundId: roundNumber });

export const getInternalLineup = (championshipId, userteamId, roundId) =>
    internalPost('/1/userteam/roundlineup', { championshipId, userteamId, round: roundId });

export const getInternalCup = (championshipId) =>
    internalPost('/5/cup/get', { championshipId });

export const getInternalRankingMatches = (championshipId) =>
    internalPost('/5/ranking/matches', { championshipId });

// External methods
export const getChampionships = () => Promise.resolve({
    data: CONFIG.CHAMPIONSHIPS
});

// ... other external methods remain valid for listing
export const getLeagueMatches = (league) => api.get('/league/matches', { params: { league } });

export default api;
