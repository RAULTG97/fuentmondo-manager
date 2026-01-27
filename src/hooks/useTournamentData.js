import { useEffect, useCallback, useRef } from 'react';
import { useTournament } from '../context/TournamentContext';
import { getInternalRankingRound, getInternalLineup, getInternalCup, getLeagueMatches } from '../services/api';
import { calculateH2HStandings } from '../utils/StandingsCalculator';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const useTournamentData = (activeTab) => {
    const context = useTournament();
    const isFetching = useRef(false);

    const {
        championship,
        rounds, setRounds,
        selectedRoundId, setSelectedRoundId,
        ranking, setRanking,
        matches, setMatches,
        historicalCache,
        h2hStandings, setH2HStandings,
        setSanctionsData,
        setCupData,
        setLoadingDisplay,
        setLoadingStandings,
        setLoadingAllLineups,
        setCalculationProgress,
        standingsLoaded, setStandingsLoaded,
        loadingCup, setLoadingCup
    } = context;

    /**
     * Helper for fetching with retry logic
     */
    const fetchWithRetry = async (fetcher, ...args) => {
        let lastError;
        for (let i = 0; i < MAX_RETRIES; i++) {
            try {
                return await fetcher(...args);
            } catch (err) {
                lastError = err;
                console.warn(`[RETRY ${i + 1}/${MAX_RETRIES}] Fetch failed:`, err.message);
                if (i < MAX_RETRIES - 1) await delay(RETRY_DELAY * (i + 1));
            }
        }
        throw lastError;
    };

    // 1. Initial Load of Rounds
    useEffect(() => {
        if (!championship) return;

        let isMounted = true;
        const loadRounds = async () => {
            setStandingsLoaded(false);
            setH2HStandings([]);
            setMatches([]);
            setRanking([]);
            setSanctionsData({});
            setCupData(null);
            setCalculationProgress(0);
            historicalCache.current = {};

            const league = championship.dataSourceChamp || 'espana';
            setLoadingDisplay(true);

            try {
                const data = await fetchWithRetry(getLeagueMatches, league);
                if (!isMounted) return;

                const rList = data.rounds || [];
                rList.sort((a, b) => b.number - a.number);
                rList.forEach(r => {
                    if (!r.date && r.matches?.length > 0) r.date = r.matches[0].date;
                });
                setRounds(rList);

                const now = new Date();
                const latestPlayed = rList.find(r => r.date && new Date(r.date) < now);
                const initialRoundId = latestPlayed ? latestPlayed._id : (rList[0]?._id || null);
                setSelectedRoundId(initialRoundId);
            } catch (err) {
                console.error("[FATAL] Failed to load rounds:", err);
            } finally {
                if (isMounted) setLoadingDisplay(false);
            }
        };

        loadRounds();
        return () => { isMounted = false; };
    }, [championship]);

    // 2. Fetch Ranking & Matches for Selected Round
    useEffect(() => {
        if (!selectedRoundId || !championship) return;

        let isMounted = true;
        const loadRoundDetail = async () => {
            setLoadingDisplay(true);
            try {
                const data = await fetchWithRetry(getInternalRankingRound, championship._id, selectedRoundId);
                if (!isMounted || !data) return;

                const rankList = data.ranking || [];
                setRanking(rankList);

                if (data.matches) {
                    const indexToName = {};
                    const indexToRealId = {};
                    rankList.forEach((t, idx) => {
                        indexToName[idx + 1] = t.name;
                        indexToRealId[idx + 1] = t._id;
                    });

                    const processed = data.matches.map(m => {
                        const pIds = m.p || [];
                        const scores = m.m || [0, 0];
                        return {
                            ...m,
                            p: pIds,
                            homeName: indexToName[pIds[0]] || "Unknown",
                            awayName: indexToName[pIds[1]] || "Unknown",
                            homeTeamId: indexToRealId[pIds[0]],
                            awayTeamId: indexToRealId[pIds[1]],
                            homeScore: scores[0],
                            awayScore: scores[1],
                            enriched: false
                        };
                    });
                    setMatches(processed);
                    enrichCurrentMatches(processed, championship._id, selectedRoundId);
                }
            } catch (err) {
                console.error("[ERROR] Round data failed:", err);
            } finally {
                if (isMounted) setLoadingDisplay(false);
            }
        };

        loadRoundDetail();
        return () => { isMounted = false; };
    }, [selectedRoundId, championship]);

    const enrichCurrentMatches = async (initialMatches, champId, rId) => {
        let currentMatches = [...initialMatches];
        const extractPts = (d) => {
            if (!d) return 0;
            const list = d.players?.initial || d.players || d.lineup || [];
            return list.reduce((acc, p) => acc + (p.points || 0), 0);
        };

        const batchSize = 3;
        for (let i = 0; i < currentMatches.length; i += batchSize) {
            const batch = currentMatches.slice(i, i + batchSize);
            await Promise.all(batch.map(async (m, idx) => {
                const gIdx = i + idx;
                if (!m.homeTeamId || !m.awayTeamId) return;
                try {
                    const [resH, resA] = await Promise.all([
                        fetchWithRetry(getInternalLineup, champId, m.homeTeamId, rId),
                        fetchWithRetry(getInternalLineup, champId, m.awayTeamId, rId)
                    ]);
                    const sH = extractPts(resH);
                    const sA = extractPts(resA);
                    currentMatches[gIdx] = {
                        ...currentMatches[gIdx],
                        homeScore: sH, awayScore: sA, m: [sH, sA],
                        lineupA: resH.players?.initial || resH.players || [],
                        lineupB: resA.players?.initial || resA.players || [],
                        enriched: true
                    };
                } catch (e) {
                    console.warn(`[ENRICH FAIL] Match ${m.homeName} vs ${m.awayName}:`, e.message);
                }
            }));
            setMatches([...currentMatches]);
        }
    };

    // 3. Tournament Wide Calculation
    const calculateTournamentWideData = useCallback(async () => {
        if (!championship || rounds.length === 0 || isFetching.current) return;

        isFetching.current = true;
        const now = new Date();
        const pastRounds = rounds.filter(r => r.date && new Date(r.date) < now);
        const roundsToFetch = pastRounds.filter(r => r._id !== selectedRoundId);

        if (!standingsLoaded) setLoadingStandings(true);
        const isSanctionView = ['sanctions', 'captains', 'teams', 'infractions', 'restricted'].includes(activeTab);
        if (isSanctionView) setLoadingAllLineups(true);

        try {
            const allRoundDataCombined = [];
            if (ranking.length > 0) {
                allRoundDataCombined.push({
                    _id: selectedRoundId,
                    number: rounds.find(r => r._id === selectedRoundId)?.number,
                    ranking, matches
                });
            }

            // Batch fetch historical rankings
            const batchSizeFetch = 5;
            const neededFetch = roundsToFetch.filter(r => !historicalCache.current[r._id]);
            for (let i = 0; i < neededFetch.length; i += batchSizeFetch) {
                const batch = neededFetch.slice(i, i + batchSizeFetch);
                const results = await Promise.all(batch.map(r => getInternalRankingRound(championship._id, r._id).catch(() => null)));
                results.forEach((data, idx) => {
                    if (data) historicalCache.current[batch[idx]._id] = { ...data, _id: batch[idx]._id, number: batch[idx].number };
                });
                if (neededFetch.length > 0) setCalculationProgress(Math.round(((i + batch.length) / neededFetch.length) * 100));
            }

            roundsToFetch.forEach(r => { if (historicalCache.current[r._id]) allRoundDataCombined.push(historicalCache.current[r._id]); });

            // Fetch missing lineups for sanctions logic
            const needsSanctionsData = ['sanctions', 'captains', 'teams', 'infractions', 'restricted', 'standings'].includes(activeTab);
            if (needsSanctionsData) {
                for (const rd of allRoundDataCombined) {
                    if (!rd.matches || !rd.ranking) continue;
                    let anyNew = false;
                    const getLineupSafe = async (tid) => {
                        try {
                            const res = await fetchWithRetry(getInternalLineup, championship._id, tid, rd._id);
                            return (res?.players?.initial) ? res.players.initial : (res?.players || []);
                        } catch (e) { return []; }
                    };

                    for (let i = 0; i < rd.matches.length; i += 2) {
                        const batch = rd.matches.slice(i, i + 2);
                        await Promise.all(batch.map(async (m) => {
                            if (!m.lineupA) {
                                const tA = rd.ranking[m.p[0] - 1];
                                if (tA) { m.lineupA = await getLineupSafe(tA._id); anyNew = true; }
                            }
                            if (!m.lineupB) {
                                const tB = rd.ranking[m.p[1] - 1];
                                if (tB) { m.lineupB = await getLineupSafe(tB._id); anyNew = true; }
                            }
                        }));
                    }
                    if (anyNew && rd._id !== selectedRoundId) historicalCache.current[rd._id] = { ...rd };
                }

                const sCalc = await import('../utils/SanctionsCalculator');
                const allTeamsMap = new Map();
                allRoundDataCombined.forEach(rd => rd.ranking?.forEach(t => allTeamsMap.set(t._id, t)));
                const teamList = Array.from(allTeamsMap.values());
                teamList.__championshipName = championship.name;
                setSanctionsData(sCalc.calculateSanctions(allRoundDataCombined, teamList));
            }

            const standings = calculateH2HStandings(allRoundDataCombined);
            if (activeTab === 'teams' || activeTab === 'standings') {
                standings.forEach(team => {
                    const latestWithLineup = [...allRoundDataCombined]
                        .sort((a, b) => b.number - a.number)
                        .find(rd => {
                            const m = rd.matches?.find(m => m.homeTeamId === team.id || m.awayTeamId === team.id);
                            return m && (m.lineupA || m.lineupB);
                        });

                    if (latestWithLineup) {
                        const m = latestWithLineup.matches.find(m => m.homeTeamId === team.id || m.awayTeamId === team.id);
                        team.lastMatchData = {
                            round: latestWithLineup.number,
                            score: m.homeTeamId === team.id ? m.homeScore : m.awayScore,
                            lineup: m.homeTeamId === team.id ? m.lineupA : m.lineupB
                        };
                    }
                });
            }
            setH2HStandings(standings);
            setStandingsLoaded(true);
        } catch (e) {
            console.error("[CALC ERROR] Failed wide calculation:", e);
        } finally {
            setLoadingStandings(false);
            setLoadingAllLineups(false);
            isFetching.current = false;
        }
    }, [championship, rounds, selectedRoundId, ranking, matches, activeTab, standingsLoaded]);

    useEffect(() => {
        const needsCalc = ['standings', 'captains', 'sanctions', 'infractions', 'restricted', 'teams'].includes(activeTab);
        if (needsCalc && rounds.length > 0) calculateTournamentWideData();
    }, [activeTab, calculateTournamentWideData, rounds]);

    // 4. Load Cup Data
    const loadCupData = useCallback(async () => {
        if (!championship || championship.type !== 'copa') return;

        setLoadingCup(true);
        try {
            const data = await fetchWithRetry(getInternalCup, championship._id);
            setCupData(data);
        } catch (err) {
            console.error('[ERROR] Failed to load cup data:', err);
            setCupData(null);
        } finally {
            setLoadingCup(false);
        }
    }, [championship, setLoadingCup, setCupData]);

    useEffect(() => {
        if (championship?.type === 'copa' && (activeTab === 'copa' || activeTab === 'teams')) {
            loadCupData();
        }
    }, [championship, activeTab, loadCupData]);

    return context;
};
