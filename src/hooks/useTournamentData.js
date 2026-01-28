import { useEffect, useCallback, useRef } from 'react';
import { useTournament } from '../context/TournamentContext';
import { getInternalRankingRound, getInternalLineup, getInternalCup, getLeagueMatches, getInternalRankingMatches } from '../services/api';
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
        fullCalendar, setFullCalendar,
        currentRoundNumber, setCurrentRoundNumber,
        calendarData, setCalendarData,
        allRounds, setAllRounds,
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

                // For league championships, create all 38 rounds
                if (championship.type !== 'copa') {
                    const all38Rounds = [];
                    for (let i = 1; i <= 38; i++) {
                        const existingRound = rList.find(r => r.number === i);
                        if (existingRound) {
                            // Preserve EXISTING _id (it's a MongoDB string), but use number for navigation
                            all38Rounds.push({ ...existingRound });
                        } else {
                            // Create placeholder for rounds not in API (1-19 are historical)
                            all38Rounds.push({
                                _id: i, // Use number as ID for historical/placeholder only
                                number: i,
                                isHistorical: i <= 19,
                                matches: []
                            });
                        }
                    }
                    all38Rounds.sort((a, b) => b.number - a.number);
                    setRounds(all38Rounds);

                    // Find current round or latest available
                    const now = new Date();
                    const latestPlayed = all38Rounds.find(r => r.date && new Date(r.date) < now);
                    // Default to latest played or round 20, using number as ID
                    const initialRoundId = latestPlayed ? latestPlayed.number : 20;
                    setSelectedRoundId(initialRoundId);
                } else {
                    // For Copa, use existing logic
                    setRounds(rList);
                    const now = new Date();
                    const latestPlayed = rList.find(r => r.date && new Date(r.date) < now);
                    const initialRoundId = latestPlayed ? latestPlayed._id : (rList[0]?._id || null);
                    setSelectedRoundId(initialRoundId);
                }
            } catch (err) {
                console.error("[FATAL] Failed to load rounds:", err);
            } finally {
                if (isMounted) setLoadingDisplay(false);
            }
        };

        loadRounds();
        return () => { isMounted = false; };
    }, [championship]);

    // 1b. Load Full Calendar for League Championships
    useEffect(() => {
        if (!championship || championship.type === 'copa') return;

        let isMounted = true;
        const loadCalendar = async () => {
            try {
                const data = await fetchWithRetry(getInternalRankingMatches, championship._id);
                if (!isMounted || !data) return;

                setCalendarData(data);

                // Build all 38 rounds with status
                const teams = data.teams || [];
                const apiRounds = data.rounds || [];
                const currentRoundData = data.current;

                // Determine current round number from API
                let currentJornada = null;
                if (currentRoundData && currentRoundData.length > 0) {
                    const firstMatch = currentRoundData[0];
                    if (firstMatch?.id?.r) {
                        currentJornada = firstMatch.id.r + 19; // r=1 -> Jornada 20
                    }
                }

                // If API doesn't specify current, find the latest one with matches/scores
                if (!currentJornada) {
                    // We'll calculate it after creating all38Rounds
                }

                // Create all 38 rounds
                const all38Rounds = [];
                for (let jornada = 1; jornada <= 38; jornada++) {
                    let status = 'future';
                    let matchesData = null;

                    // Link to real round ID from rounds state
                    const roundObj = rounds.find(r => r.number === jornada);
                    const roundId = roundObj?._id;

                    if (jornada <= 19) {
                        status = 'historical';
                    } else {
                        const apiRoundIndex = jornada - 20; // Jornada 20 -> index 0
                        const apiRoundData = apiRounds[apiRoundIndex];

                        if (apiRoundData && apiRoundData.length > 0) {
                            // Check if this round has scores (m field)
                            const hasScores = apiRoundData.some(m => m.m && m.m.length > 0);

                            if (jornada === currentJornada) {
                                status = 'current';
                            } else if (hasScores) {
                                status = 'past';
                            } else {
                                status = 'future';
                            }

                            // Process matches for this round
                            matchesData = apiRoundData.map(m => {
                                const pIds = m.p || [];
                                const scores = m.m || [0, 0];

                                // In this API, pIds are indices into the teams array
                                const homeTeam = data.teams?.[pIds[0] - 1];
                                const awayTeam = data.teams?.[pIds[1] - 1];

                                return {
                                    ...m,
                                    homeName: homeTeam?.name || homeTeam?.n || "Unknown",
                                    awayName: awayTeam?.name || awayTeam?.n || "Unknown",
                                    homeTeamId: homeTeam?._id,
                                    awayTeamId: awayTeam?._id,
                                    homeScore: scores[0] || 0,
                                    awayScore: scores[1] || 0,
                                    hasScores: m.m && m.m.length > 0
                                };
                            });
                        }
                    }

                    all38Rounds.push({
                        _id: roundId,
                        number: jornada,
                        status,
                        matches: matchesData
                    });
                }

                // Determine currentJornada as the highest ID with scores (status 'past')
                const playedRounds = all38Rounds.filter(r => r.status === 'past');
                if (playedRounds.length > 0) {
                    const highestPlayed = [...playedRounds].sort((a, b) => b.number - a.number)[0];
                    currentJornada = highestPlayed.number;
                } else if (!currentJornada) {
                    currentJornada = 20; // Default fallback for leagues
                }

                setCurrentRoundNumber(currentJornada);
                setAllRounds(all38Rounds);

                // For leagues, if we don't have a selectedRoundId yet, set it to currentJornada
                if (currentJornada && !selectedRoundId) {
                    setSelectedRoundId(currentJornada);
                }
            } catch (err) {
                console.error("[ERROR] Failed to load calendar:", err);
            }
        };

        if (championship && championship.type !== 'copa' && rounds.length > 0) {
            loadCalendar();
        }
        return () => { isMounted = false; };
    }, [championship, rounds.length]);

    // 2. Fetch Ranking & Matches for Selected Round
    useEffect(() => {
        if (!selectedRoundId || !championship) return;

        let isMounted = true;
        const loadRoundDetail = async () => {
            // Handle historical rounds for leagues
            if (championship.type !== 'copa' && typeof selectedRoundId === 'number' && selectedRoundId < 20) {
                setMatches([]);
                setRanking([]);
                setLoadingDisplay(false);
                return;
            }

            setLoadingDisplay(true);
            try {
                // Determine API round ID
                let apiRoundId = selectedRoundId;

                // If it's a league and selectedRoundId is a number (jornada)
                if (championship.type !== 'copa' && typeof selectedRoundId === 'number') {
                    // We need to find the REAL round ID from the rounds list if it exists
                    const roundObj = rounds.find(r => r.number === selectedRoundId);
                    // However, getLeagueMatches might not have the ID we need if it's from the other API
                    // Let's try to use the selectedRoundId as is, but if it's >= 20, 
                    // we might need to map it if the API requires something else.

                    // IF we have allRounds, we can use the matches from there immediately
                    if (allRounds.length > 0) {
                        const currentRound = allRounds.find(r => r.number === selectedRoundId);
                        if (currentRound && currentRound.matches) {
                            setMatches(currentRound.matches);
                        }
                    }
                }

                // If apiRoundId is still a number for a league >= 20, we need the actual MongoDB ID
                // to call getInternalRankingRound correctly (for ranking/standings)
                let actualIdForAPI = apiRoundId;
                if (championship.type !== 'copa' && typeof selectedRoundId === 'number') {
                    // Try to find the original ID from championship data if available
                    // or just skip if we only care about matches which we already set above.
                    // For now, let's try to call the API to get the ranking
                    const originalRound = rounds.find(r => r.number === selectedRoundId);
                    if (originalRound && typeof originalRound._id === 'string') {
                        actualIdForAPI = originalRound._id;
                    }
                }

                if (actualIdForAPI === null) {
                    setLoadingDisplay(false);
                    return;
                }

                const data = await fetchWithRetry(getInternalRankingRound, championship._id, actualIdForAPI);
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
                    enrichCurrentMatches(processed, championship._id, actualIdForAPI);
                }
            } catch (err) {
                console.error("[ERROR] Round data failed:", err);
            } finally {
                if (isMounted) setLoadingDisplay(false);
            }
        };

        loadRoundDetail();
        return () => { isMounted = false; };
    }, [selectedRoundId, championship, rounds, allRounds]);

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
        const pastRounds = rounds.filter(r => (r.date && new Date(r.date) < now) || r.status === 'past');
        // Include current round if it exists
        const currentRound = rounds.find(r => r.number === currentRoundNumber || r.status === 'current');
        const roundsToFetch = [...pastRounds];
        if (currentRound && !roundsToFetch.find(r => r._id === currentRound._id)) {
            roundsToFetch.push(currentRound);
        }

        if (!standingsLoaded) setLoadingStandings(true);
        const isSanctionView = ['sanctions', 'captains', 'teams', 'infractions', 'restricted'].includes(activeTab);
        if (isSanctionView) setLoadingAllLineups(true);

        try {
            const allRoundDataCombined = [];
            // Batch fetch historical rankings for ALL past rounds
            const neededFetch = roundsToFetch.filter(r => !historicalCache.current[r._id]);
            const batchSizeFetch = 5;
            for (let i = 0; i < neededFetch.length; i += batchSizeFetch) {
                const batch = neededFetch.slice(i, i + batchSizeFetch);
                const results = await Promise.all(batch.map(r => getInternalRankingRound(championship._id, r._id).catch(() => null)));
                results.forEach((data, idx) => {
                    if (data) {
                        const roundInfo = batch[idx];
                        const idxToId = {};
                        data.ranking?.forEach((t, i) => idxToId[i + 1] = t._id);

                        // Process matches to add homeTeamId/awayTeamId and scores
                        if (data.matches) {
                            data.matches = data.matches.map(m => {
                                const pIds = m.p || [];
                                const scores = m.m || [0, 0];
                                return {
                                    ...m,
                                    homeTeamId: idxToId[pIds[0]],
                                    awayTeamId: idxToId[pIds[1]],
                                    homeScore: scores[0] || 0,
                                    awayScore: scores[1] || 0
                                };
                            });
                        }
                        historicalCache.current[roundInfo._id] = { ...data, _id: roundInfo._id, number: roundInfo.number };
                    }
                });
                if (neededFetch.length > 0) setCalculationProgress(Math.round(((i + batch.length) / neededFetch.length) * 100));
            }

            roundsToFetch.forEach(r => {
                if (historicalCache.current[r._id]) {
                    allRoundDataCombined.push(historicalCache.current[r._id]);
                }
            });

            // Fetch missing lineups for sanctions logic
            const needsSanctionsData = ['sanctions', 'captains', 'teams', 'infractions', 'restricted', 'standings', 'calendar'].includes(activeTab);
            if (needsSanctionsData) {
                const sCalc = await import('../utils/SanctionsCalculator');
                const allTeamsMap = new Map();
                allRoundDataCombined.forEach(rd => rd.ranking?.forEach(t => allTeamsMap.set(t._id, t)));
                const teamList = Array.from(allTeamsMap.values());
                teamList.__championshipName = championship.name;

                // --- OPTIMIZATION: Early Standings Calculate & Set ---
                const filteredRounds = allRoundDataCombined.filter(rd => {
                    const rObj = rounds.find(r => r._id === rd._id || r.number === rd.number);
                    return rObj && (rObj.status === 'past' || rObj.status === 'historical' || (rObj.date && new Date(rObj.date) < now));
                });
                const initialStandings = calculateH2HStandings(filteredRounds);

                // --- NEW: Populate initial lastMatchData from cached lineups ---
                const reverseRoundsForInitial = [...filteredRounds].sort((a, b) => b.number - a.number);
                initialStandings.forEach(team => {
                    for (const rd of reverseRoundsForInitial) {
                        const m = rd.matches?.find(m => m.homeTeamId === team.id || m.awayTeamId === team.id);
                        if (m && (m.lineupA || m.lineupB)) {
                            team.lastMatchData = {
                                round: rd.number,
                                score: m.homeTeamId === team.id ? m.homeScore : m.awayScore,
                                lineup: m.homeTeamId === team.id ? m.lineupA : m.lineupB
                            };
                            break; // Found the most recent one
                        }
                    }
                });

                setH2HStandings(initialStandings);
                setStandingsLoaded(true);
                setLoadingStandings(false); // Can hide standings loader early

                // Fetch missing lineups for sanctions logic - REVERSED for priority
                const reverseRounds = [...allRoundDataCombined].sort((a, b) => b.number - a.number);

                for (const rd of reverseRounds) {
                    if (!rd.matches || !rd.ranking) continue;
                    let anyNew = false;
                    const getLineupSafe = async (tid) => {
                        try {
                            const res = await fetchWithRetry(getInternalLineup, championship._id, tid, rd._id);
                            return (res?.players?.initial) ? res.players.initial : (res?.players || []);
                        } catch (e) { return []; }
                    };

                    // Process matches in larger batches
                    const batchSizeLineups = 4;
                    for (let i = 0; i < rd.matches.length; i += batchSizeLineups) {
                        const batch = rd.matches.slice(i, i + batchSizeLineups);
                        await Promise.all(batch.map(async (m) => {
                            if (!m.lineupA) {
                                const tA = rd.ranking?.[m.p?.[0] - 1];
                                if (tA) { m.lineupA = await getLineupSafe(tA._id, rd._id); anyNew = true; }
                                else if (m.homeTeamId) { m.lineupA = await getLineupSafe(m.homeTeamId, rd._id); anyNew = true; }
                            }
                            if (!m.lineupB) {
                                const tB = rd.ranking?.[m.p?.[1] - 1];
                                if (tB) { m.lineupB = await getLineupSafe(tB._id, rd._id); anyNew = true; }
                                else if (m.awayTeamId) { m.lineupB = await getLineupSafe(m.awayTeamId, rd._id); anyNew = true; }
                            }
                        }));
                    }
                    if (anyNew) {
                        historicalCache.current[rd._id] = { ...rd };

                        // Incremental update of "lastMatchData" for the teams panel
                        setH2HStandings(prev => {
                            const next = [...prev];
                            next.forEach(team => {
                                // Only update if this round is newer than what we have or we have nothing
                                const isNewer = !team.lastMatchData || rd.number >= team.lastMatchData.round;
                                if (isNewer) {
                                    const m = rd.matches.find(m => m.homeTeamId === team.id || m.awayTeamId === team.id);
                                    if (m && (m.lineupA || m.lineupB)) {
                                        team.lastMatchData = {
                                            round: rd.number,
                                            score: m.homeTeamId === team.id ? m.homeScore : m.awayScore,
                                            lineup: m.homeTeamId === team.id ? m.lineupA : m.lineupB
                                        };
                                    }
                                }
                            });
                            return next;
                        });
                    }
                }

                setSanctionsData(sCalc.calculateSanctions(allRoundDataCombined, teamList));
            } else {
                // If not needing full sanctions data, at least set the standings
                const standingsOnly = calculateH2HStandings(allRoundDataCombined.filter(rd => {
                    const rObj = rounds.find(r => r._id === rd._id || r.number === rd.number);
                    return rObj && (rObj.status === 'past' || rObj.status === 'historical' || (rObj.date && new Date(rObj.date) < now));
                }));
                setH2HStandings(standingsOnly);
                setStandingsLoaded(true);
            }
        } catch (e) {
            console.error("[CALC ERROR] Failed wide calculation:", e);
        } finally {
            setLoadingStandings(false);
            setLoadingAllLineups(false);
            isFetching.current = false;
        }
    }, [championship, rounds, selectedRoundId, currentRoundNumber, ranking, matches, activeTab]);

    useEffect(() => {
        const needsCalc = ['standings', 'captains', 'sanctions', 'infractions', 'restricted', 'teams', 'calendar'].includes(activeTab);
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
