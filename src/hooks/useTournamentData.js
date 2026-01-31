import { useEffect, useCallback, useRef } from 'react';
import { useTournament } from '../context/TournamentContext';
import { getInternalRankingRound, getInternalLineup, getInternalCup, getLeagueMatches, getInternalRankingMatches } from '../services/api';
import { calculateH2HStandings } from '../utils/StandingsCalculator';
import { CopaSanctionsService } from '../services/copaSanctionsService';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const useTournamentData = (activeTab) => {
    const context = useTournament();
    const isFetching = useRef(false);
    const allRoundsRef = useRef([]);

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
        cupData, setCupData,
        setLoadingDisplay,
        setLoadingStandings,
        loadingAllLineups, setLoadingAllLineups,
        setCalculationProgress,
        standingsLoaded, setStandingsLoaded,
        loadingCup, setLoadingCup,
        copaAnalysis, setCopaAnalysis
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
                // Silent retry
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
                    // For leagues, we DO NOT set the default round here anymore to avoid FOUC (flash of wrong round).
                    // We wait for loadCalendar to get the authoritative "current" round.
                    // However, we MUST set selectedRoundId if it is strictly null, but maybe we can wait?
                    // Let's NOT set it here.
                    // const initialRoundId = latestPlayed ? latestPlayed.number : 20;
                    // setSelectedRoundId(initialRoundId);
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
                if (isMounted) {
                    // For leagues, we keep loading true until loadCalendar finishes to prevent flash
                    if (championship.type === 'copa') {
                        setLoadingDisplay(false);
                    }
                }
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
                // Determine if we need live data for calendar (usually yes, for scores)
                // We'll trust the default short TTL (1 min) if we pass true, or intermediate (5 min) if false.
                // Since this shows "current" round scores, better to be relatively fresh.
                const data = await fetchWithRetry(getInternalRankingMatches, championship._id, true);
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

                // Determine currentJornada as the highest ID with scores (status 'past') IF NOT ALREADY FOUND
                if (!currentJornada) {
                    const playedRounds = all38Rounds.filter(r => r.status === 'past');
                    if (playedRounds.length > 0) {
                        const highestPlayed = [...playedRounds].sort((a, b) => b.number - a.number)[0];
                        currentJornada = highestPlayed.number;
                    } else {
                        currentJornada = 20; // Default fallback for leagues
                    }
                }

                setCurrentRoundNumber(currentJornada);
                setAllRounds(all38Rounds);
                allRoundsRef.current = all38Rounds;

                // For leagues, if we found a definitive current round from the API, enforce it
                if (currentJornada) {
                    setSelectedRoundId(currentJornada);
                }
            } catch (err) {
                console.error("[ERROR] Failed to load calendar:", err);
            } finally {
                // This is where we turn off the main loader for leagues
                if (isMounted) setLoadingDisplay(false);
            }
        };

        if (championship && championship.type !== 'copa' && rounds.length > 0) {
            loadCalendar();
        }
        return () => { isMounted = false; };
    }, [championship, rounds.length]);

    const enrichCurrentMatches = useCallback(async (initialMatches, champId, rId, roundNumber) => {
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

                // Determine if this specific round is live for cache purposes
                // If roundNumber matches currentRoundNumber, we treat it as live
                const isRoundLive = roundNumber === currentRoundNumber;

                try {
                    const [resH, resA] = await Promise.all([
                        fetchWithRetry(getInternalLineup, champId, m.homeTeamId, rId, isRoundLive),
                        fetchWithRetry(getInternalLineup, champId, m.awayTeamId, rId, isRoundLive)
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
                    // Silent failure for matching matchups with live data if missing
                }
            }));

            const updated = [...currentMatches];
            setMatches(updated);

            // Sincronizar con allRounds para que se vea en el Dashboard de ligas
            if (championship?.type !== 'copa' && roundNumber) {
                setAllRounds(prev => {
                    const next = prev.map(r =>
                        r.number === roundNumber ? { ...r, matches: updated } : r
                    );
                    allRoundsRef.current = next;
                    return next;
                });
            }
        }
    }, [setMatches, setAllRounds, championship, currentRoundNumber]);

    // 2. Fetch Ranking & Matches for Selected Round
    const loadRoundDetail = useCallback(async (isAutoRefresh = false) => {
        if (!selectedRoundId || !championship) return;

        // Handle historical rounds for leagues
        if (championship.type !== 'copa' && typeof selectedRoundId === 'number' && selectedRoundId < 20) {
            setMatches([]);
            setRanking([]);
            if (!isAutoRefresh) setLoadingDisplay(false);
            return;
        }

        // --- OPTIMIZATION BEGIN ---
        // 1. Try to load from cache (allRounds) immediately
        const cachedRound = allRoundsRef.current.find(r => r.number === selectedRoundId || r._id === selectedRoundId);
        const hasCachedMatches = cachedRound?.matches && cachedRound.matches.length > 0;
        const isPast = cachedRound?.status === 'past' || cachedRound?.status === 'historical';
        const isFuture = cachedRound?.status === 'future';

        if (hasCachedMatches) {
            setMatches(cachedRound.matches);
            // If it's a past round and we are in "matchups" view, we can skip the fetch entirely
            // because scores rarely change for past rounds.
            // Also skip for FUTURE rounds - no point fetching details for empty games if we have the schedule
            if ((isPast || isFuture) && !isAutoRefresh && activeTab === 'matchups') {
                setLoadingDisplay(false);
                return;
            }
        }
        // --- OPTIMIZATION END ---

        // Only show loader if we didn't find data in cache
        if (!hasCachedMatches && !isAutoRefresh) setLoadingDisplay(true);

        try {
            // Determine API round ID
            let apiRoundId = selectedRoundId;

            // (Previous logic for finding matches from allRounds removed as it is now handled by the optimization block above)

            let actualIdForAPI = apiRoundId;
            if (championship.type !== 'copa' && typeof selectedRoundId === 'number') {
                const originalRound = rounds.find(r => r.number === selectedRoundId);
                if (originalRound && typeof originalRound._id === 'string') {
                    actualIdForAPI = originalRound._id;
                }
            }

            if (actualIdForAPI === null) {
                if (!isAutoRefresh) setLoadingDisplay(false);
                return;
            }

            // Verify if selected round is "live" (current or future-but-active)
            const roundObj = rounds.find(r => r.number === selectedRoundId || r._id === selectedRoundId);
            const isRoundLive = selectedRoundId === currentRoundNumber ||
                (roundObj && roundObj.status === 'current');

            const data = await fetchWithRetry(getInternalRankingRound, championship._id, actualIdForAPI, isRoundLive);
            if (!data) return;

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
                    const homeTeamId = indexToRealId[pIds[0]];
                    const awayTeamId = indexToRealId[pIds[1]];

                    // Check if we already have enriched data for this match in cache or current state
                    const existingMatch = matches.find(em => em.homeTeamId === homeTeamId && em.awayTeamId === awayTeamId) ||
                        (allRoundsRef.current.find(r => r.number === selectedRoundId)?.matches?.find(em => em.homeTeamId === homeTeamId && em.awayTeamId === awayTeamId));

                    return {
                        ...m,
                        p: pIds,
                        homeName: indexToName[pIds[0]] || "Unknown",
                        awayName: indexToName[pIds[1]] || "Unknown",
                        homeTeamId,
                        awayTeamId,
                        homeScore: scores[0],
                        awayScore: scores[1],
                        // Preserve enriched data if available to avoid UI flashing "Pending"
                        enriched: existingMatch?.enriched || false,
                        lineupA: existingMatch?.lineupA || [],
                        lineupB: existingMatch?.lineupB || [],
                        // If we have preserved enriched data, we should probably treat it as such, 
                        // but strictly speaking the NEW scores might imply point changes that won't be in lineupA/B yet.
                        // However, keeping them prevents the "basic view" fallback.
                    };
                });

                setMatches(processed);

                // Sincronizar con allRounds
                if (championship.type !== 'copa' && typeof selectedRoundId === 'number') {
                    setAllRounds(prev => {
                        const next = prev.map(r =>
                            r.number === selectedRoundId ? { ...r, styles: 'cached', matches: processed } : r
                        );
                        allRoundsRef.current = next;
                        return next;
                    });
                }

                // Only enrich with lineup data if this is the current/live round
                // For past rounds, we rely on cached data from allRounds or skip enrichment
                const roundNumber = typeof selectedRoundId === 'number' ? selectedRoundId : null;
                const isCurrentRound = roundNumber === currentRoundNumber;

                if (isCurrentRound) {
                    // Live round: fetch fresh lineup data with short TTL
                    enrichCurrentMatches(processed, championship._id, actualIdForAPI, roundNumber);
                } else {
                    // Past/future round: check if we already have enriched data in allRounds
                    const cachedRound = allRoundsRef.current.find(r => r.number === roundNumber);
                    if (cachedRound?.matches?.some(m => m.enriched)) {
                        // Use cached enriched data
                        setMatches(cachedRound.matches);
                    }
                    // Otherwise, just use the basic scores from the ranking API (already set above)
                }
            }
        } catch (err) {
            console.error("[ERROR] Round data failed:", err);
        } finally {
            if (!isAutoRefresh) setLoadingDisplay(false);
        }
    }, [selectedRoundId, championship, rounds, enrichCurrentMatches, setMatches, setRanking, setLoadingDisplay, setAllRounds, currentRoundNumber, activeTab]);

    useEffect(() => {
        loadRoundDetail();
    }, [loadRoundDetail]);

    // 2b. Polling for Live Data
    useEffect(() => {
        if (!selectedRoundId || !championship) return;

        // Solo polleamos en vistas donde los puntos en vivo son críticos
        const isLiveView = ['matchups', 'dashboard', 'standings', 'calendar'].includes(activeTab);
        if (!isLiveView) return;

        // Determinar si la jornada seleccionada es la actual o futura (potencialmente en vivo)
        const roundObj = rounds.find(r => r.number === selectedRoundId || r._id === selectedRoundId);
        // STRICT OPTIMIZATION: Only poll if the status is explicitly 'current'
        const isCurrent = roundObj?.status === 'current';

        // Si NO es la jornada en curso, no hacemos polling
        if (!isCurrent) return;

        const intervalId = setInterval(() => {
            loadRoundDetail(true); // true = autoRefresh (sin loader)
        }, 15000); // 15 segundos

        return () => clearInterval(intervalId);
    }, [selectedRoundId, championship, activeTab, loadRoundDetail, rounds]);

    // 3. Tournament Wide Calculation
    const calculateTournamentWideData = useCallback(async () => {
        if (!championship || rounds.length === 0) return;

        // Removing isFetching current check to allow updates from polling to trigger recalc
        // isFetching.current = true; // We rely on cache to make this fast
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
                // Historical data -> isLive = false
                const results = await Promise.all(batch.map(r => getInternalRankingRound(championship._id, r._id, false).catch(() => null)));
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
                const filteredRounds = allRoundDataCombined.map(rd => {
                    // Check if we have live matches for this round in the state
                    // This happens if the user is viewing the current round or we are polling it
                    const isCurrentRoundData = rd.number === currentRoundNumber;
                    if (isCurrentRoundData && matches && matches.length > 0) {
                        // Check if the matches in state belong to this round (heuristic or explicit check)
                        // Since 'matches' state usually holds the selected round, and if selected == current
                        // we can assume it's the live data.
                        if (selectedRoundId === currentRoundNumber) {
                            return { ...rd, matches: matches };
                        }
                    }
                    return rd;
                }).filter(rd => {
                    const rObj = rounds.find(r => r._id === rd._id || r.number === rd.number);
                    // Include if past/historical OR if it's the current/live round with data
                    return rObj && (
                        rObj.status === 'past' ||
                        rObj.status === 'historical' ||
                        rObj.status === 'current' || // Explicitly include current
                        (rObj.date && new Date(rObj.date) < now)
                    );
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



                // --- OPTIMIZATION: Parallelize Round Processing ---
                // Process rounds in batches to avoid waterfall but limit concurrency
                const batchSizeRounds = 5;
                for (let i = 0; i < reverseRounds.length; i += batchSizeRounds) {
                    const roundBatch = reverseRounds.slice(i, i + batchSizeRounds);
                    await Promise.all(roundBatch.map(async (rd) => {
                        if (!rd.matches || !rd.ranking) return;

                        let anyNew = false;
                        const getLineupSafe = async (tid) => {
                            try {
                                // Historical lineups -> isLive = false
                                const res = await fetchWithRetry(getInternalLineup, championship._id, tid, rd._id, false);
                                return (res?.players?.initial) ? res.players.initial : (res?.players || []);
                            } catch (e) { return []; }
                        };

                        // Process matches in this round in batches to be nice to API
                        const batchSizeLineups = 4;
                        for (let j = 0; j < rd.matches.length; j += batchSizeLineups) {
                            const batch = rd.matches.slice(j, j + batchSizeLineups);
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
                    }));
                }

                setSanctionsData(sCalc.calculateSanctions(allRoundDataCombined, teamList));
            } else {
                // If not needing full sanctions data, at least set the standings
                const standingsOnly = calculateH2HStandings(allRoundDataCombined.filter(rd => {
                    const rObj = rounds.find(r => r._id === rd._id || r.number === rd.number);
                    return rObj && (
                        rObj.status === 'past' ||
                        rObj.status === 'historical' ||
                        rObj.status === 'current' ||
                        (rObj.date && new Date(rObj.date) < now)
                    );
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
        // Force reset analysis when championship changes
        setCopaAnalysis(null);
    }, [championship, setLoadingCup, setCupData, setCopaAnalysis]);

    useEffect(() => {
        if (championship?.type === 'copa' && (activeTab === 'copa' || activeTab === 'teams' || activeTab === 'captains' || activeTab === 'sanctions')) {
            loadCupData();
        }
    }, [championship, activeTab, loadCupData]);

    // 4b. Polling for Live Cup Data
    useEffect(() => {
        if (!championship || championship.type !== 'copa' || activeTab !== 'copa') return;

        const intervalId = setInterval(() => {
            // We use a specific fetch to avoid full reload if possible, 
            // but loadCupData is already quite direct.
            loadCupData();
        }, 30000); // 30 seconds for Copa (less aggressive than Liga to save API)

        return () => clearInterval(intervalId);
    }, [championship, activeTab, loadCupData]);

    // 5. Global Copa Analysis (Calculate Sanctions & Captains)
    useEffect(() => {
        if (championship?.type === 'copa' && cupData && !copaAnalysis && !loadingCup) {
            const runAnalysis = async () => {
                setCalculationProgress(5);
                try {
                    // This triggers the heavy lifting: fetching all lineups and calculating sanctions
                    const result = await CopaSanctionsService.scanCopaAndCalculate(championship._id, cupData);
                    setCopaAnalysis(result);
                } catch (err) {
                    console.error("[CopaGlobal] Analysis failed:", err);
                } finally {
                    setCalculationProgress(0);
                }
            };
            runAnalysis();
        }
    }, [championship?._id, cupData, copaAnalysis, loadingCup, setCopaAnalysis]);

    return context;
};
