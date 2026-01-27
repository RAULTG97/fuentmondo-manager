import axios from 'axios';

const API_KEY = "771b0d19-3723-4f85-a5e5-ab43daccc088";

const api = axios.create({
    baseURL: '/api',
    params: {
        apiKey: API_KEY
    }
});

// Add response interceptor to handle errors or unwrap "answer" if needed
api.interceptors.response.use(
    (response) => {
        // The API seems to wrap everything in "answer"
        if (response.data && response.data.answer) {
            return response.data.answer;
        }
        return response.data;
    },
    (error) => {
        console.error("API Error:", error);
        return Promise.reject(error);
    }
);

const INTERNAL_TOKEN = "e1c9_5554f9913726b6e2563b78e8200c5e5b";
const INTERNAL_USER_ID = "55e4de47d26f276304fcc222";

const internalApi = axios.create({
    baseURL: '/internal-api',
    headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://app.futmondo.com'
    }
});

const internalPost = (endpoint, query) => {
    return internalApi.post(endpoint, {
        header: { token: INTERNAL_TOKEN, userid: INTERNAL_USER_ID },
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

// External (Kong) methods
export const getChampionships = () => Promise.resolve({
    data: [
        {
            _id: "6598143af1e53905facfcc6d", // From previous functional logs (Champions/Copa context)
            id: "6598143af1e53905facfcc6d",
            name: "Champions Fuentmondo (1a Div)",
            dataSourceChamp: "espana",
            userteamId: "65981926d220e05de3fdc762" // Known from debug script
        },
        {
            _id: "65981dd8f1fa9605fbefe305", // La Liga ML ID
            id: "65981dd8f1fa9605fbefe305",
            name: "La Liga ML (2a Div)",
            dataSourceChamp: "espana",
        },
        {
            _id: "697663371311f0fd5379a446", // COPA PIRAÑA ID from payload_copa.json
            id: "697663371311f0fd5379a446",
            name: "COPA PIRAÑA",
            dataSourceChamp: "espana",
            userteamId: "69766337c15cdb2bd57b94c0",
            type: "copa" // Type to handle different UI (changed from mode to type)
        }
    ]
});

// ... other external methods remain valid for listing
export const getLeagueMatches = (league) => api.get('/league/matches', { params: { league } });

export default api;
