import { useEffect, useCallback } from 'react';
import { useTournament } from '../context/TournamentContext';
import { getInternalRankingRound, getInternalLineup, getInternalCup, getLeagueMatches } from '../services/api';
import { calculateH2HStandings } from '../utils/StandingsCalculator';

export const useTournamentData = (activeTab) => {
    const context = useTournament();
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

    // 1. Initial Load of Rounds
    useEffect(() => {
        if (!championship) return;

        // Reset state for new championship
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

        getLeagueMatches(league)
            .then(data => {
                const rList = data.rounds || [];
                rList.sort((a, b) => b.number - a.number);
                rList.forEach(r => {
                    if (!r.date && r.matches && r.matches.length > 0) r.date = r.matches[0].date;
                });
                setRounds(rList);

                const now = new Date();
                const latestPlayed = rList.find(r => r.date && new Date(r.date) < now);
                const initialRoundId = latestPlayed ? latestPlayed._id : (rList[0]?._id || null);
                setSelectedRoundId(initialRoundId);
                setLoadingDisplay(false);
            })
            .catch(err => {
                console.error("Failed load rounds", err);
                setLoadingDisplay(false);
            });
    }, [championship]);

    // 2. Fetch Ranking & Matches for Selected Round
    useEffect(() => {
        if (!selectedRoundId || !championship) return;

        setLoadingDisplay(true);
        getInternalRankingRound(championship._id, selectedRoundId)
            .then(data => {
                if (!data) { setLoadingDisplay(false); return; }
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
                setLoadingDisplay(false);
            })
            .catch(err => {
                console.error("Round data failed", err);
                setLoadingDisplay(false);
            });
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
                        getInternalLineup(champId, m.homeTeamId, rId),
                        getInternalLineup(champId, m.awayTeamId, rId)
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
                } catch (e) { console.warn("Enrich failed", e); }
            }));
            setMatches([...currentMatches]);
        }
    };

    // 3. Tournament Wide Calculation (Standings, Sanctions, etc.)
    const calculateTournamentWideData = useCallback(async () => {
        if (!championship || rounds.length === 0) return;

        const now = new Date();
        const pastRounds = rounds.filter(r => r.date && new Date(r.date) < now);
        const roundsToFetch = pastRounds.filter(r => r._id !== selectedRoundId);

        if (!standingsLoaded) setLoadingStandings(true);
        if (activeTab === 'sanctions' || activeTab === 'captains') setLoadingAllLineups(true);

        try {
            const allRoundDataCombined = [];
            // Current round
            if (ranking.length > 0) {
                allRoundDataCombined.push({
                    _id: selectedRoundId,
                    number: rounds.find(r => r._id === selectedRoundId)?.number,
                    ranking, matches
                });
            }

            // Sync historical
            const batchSizeFetch = 5;
            const neededFetch = roundsToFetch.filter(r => !historicalCache.current[r._id]);
            for (let i = 0; i < neededFetch.length; i += batchSizeFetch) {
                const batch = neededFetch.slice(i, i + batchSizeFetch);
                const results = await Promise.all(batch.map(r => getInternalRankingRound(championship._id, r._id)));
                results.forEach((data, idx) => {
                    if (data) historicalCache.current[batch[idx]._id] = { ...data, _id: batch[idx]._id, number: batch[idx].number };
                });
                if (neededFetch.length > 0) setCalculationProgress(Math.round(((i + batch.length) / neededFetch.length) * 100));
            }

            roundsToFetch.forEach(r => { if (historicalCache.current[r._id]) allRoundDataCombined.push(historicalCache.current[r._id]); });

            // Lineups for tabs that depend on Sanctions/Captains data
            const needsSanctionsData = ['sanctions', 'captains', 'teams', 'infractions', 'restricted', 'standings'].includes(activeTab);
            if (needsSanctionsData) {
                for (const rd of allRoundDataCombined) {
                    if (!rd.matches || !rd.ranking) continue;
                    let anyNew = false;
                    for (let i = 0; i < rd.matches.length; i += 2) {
                        const batch = rd.matches.slice(i, i + 2);
                        await Promise.all(batch.map(async (m) => {
                            const getL = async (tid) => {
                                try {
                                    const res = await getInternalLineup(championship._id, tid, rd._id);
                                    return (res.players && res.players.initial) ? res.players.initial : (res.players || []);
                                } catch (e) {
                                    console.warn("Failed fetch lineup", tid, e);
                                    return [];
                                }
                            };
                            if (!m.lineupA) {
                                const tA = rd.ranking[m.p[0] - 1];
                                if (tA) { m.lineupA = await getL(tA._id); anyNew = true; }
                            }
                            if (!m.lineupB) {
                                const tB = rd.ranking[m.p[1] - 1];
                                if (tB) { m.lineupB = await getL(tB._id); anyNew = true; }
                            }
                        }));
                    }
                    if (anyNew && rd._id !== selectedRoundId) historicalCache.current[rd._id] = { ...rd };
                }

                const sCalc = await import('../utils/SanctionsCalculator');
                const allTeams = {};
                allRoundDataCombined.forEach(rd => rd.ranking?.forEach(t => allTeams[t._id] = t));
                const teamList = Object.values(allTeams);
                teamList.__championshipName = championship.name;
                setSanctionsData(sCalc.calculateSanctions(allRoundDataCombined, teamList));
            }

            const standings = calculateH2HStandings(allRoundDataCombined);
            if (activeTab === 'teams' || activeTab === 'standings') {
                standings.forEach(team => {

                    const sorted = [...allRoundDataCombined].sort((a, b) => b.number - a.number);
                    for (const rd of sorted) {
                        const match = rd.matches?.find(m => m.homeTeamId === team.id || m.awayTeamId === team.id);
                        if (match && (match.lineupA || match.lineupB)) {
                            team.lastMatchData = {
                                round: rd.number,
                                score: match.homeTeamId === team.id ? match.homeScore : match.awayScore,
                                lineup: match.homeTeamId === team.id ? match.lineupA : match.lineupB
                            };
                            break;
                        }
                    }
                });
            }
            setH2HStandings(standings);
            setStandingsLoaded(true);
        } catch (e) { console.error("Calculation failed", e); }
        finally { setLoadingStandings(false); setLoadingAllLineups(false); }
    }, [championship, rounds, selectedRoundId, ranking, matches, activeTab, standingsLoaded]);

    useEffect(() => {
        const needsCalc = ['standings', 'captains', 'sanctions', 'infractions', 'restricted', 'teams'].includes(activeTab);
        if (needsCalc && rounds.length > 0) calculateTournamentWideData();
    }, [activeTab, calculateTournamentWideData, rounds]);

    // 4. Load Cup Data for Copa championships
    const loadCupData = useCallback(async () => {
        if (!championship || championship.type !== 'copa') return;

        setLoadingCup(true);
        try {
            const data = await getInternalCup(championship.id);
            console.log('Cup data received:', data);
            setCupData(data);
        } catch (err) {
            console.error('Failed to load cup data:', err);
            setCupData(null);
        } finally {
            setLoadingCup(false);
        }
    }, [championship, setLoadingCup, setCupData]);

    // Load Cup Data when championship is Copa type or when copa tab is active
    useEffect(() => {
        if (championship?.type === 'copa' && (activeTab === 'copa' || activeTab === 'teams')) {
            loadCupData();
        }
    }, [championship, activeTab, loadCupData]);

    return context;
};
