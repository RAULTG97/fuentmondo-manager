import axios from 'axios';
import { CONFIG } from '../config';

const api = axios.create({
    baseURL: '/api',
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
    baseURL: '/internal-api',
    headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://app.futmondo.com'
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

// External methods
export const getChampionships = () => Promise.resolve({
    data: CONFIG.CHAMPIONSHIPS
});

// ... other external methods remain valid for listing
export const getLeagueMatches = (league) => api.get('/league/matches', { params: { league } });

export default api;
