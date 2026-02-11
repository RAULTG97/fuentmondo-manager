import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Trophy, AlertTriangle, History, User, Loader2, ChevronDown, ChevronUp, Activity } from 'lucide-react';
import { getTeamShield } from '../utils/assets';
import SoccerPitch from './SoccerPitch';
import './TeamDetailModal.css';

const TeamDetailModal = ({ team, championship, h2hStandings, sanctionsData, rounds, allRounds, selectedRoundId, currentRoundNumber, cupData, copaAnalysis, onClose }) => {
    const [expandedSections, setExpandedSections] = useState({
        lineup: false,
        nextOpponent: false,
        discipline: false,
        captains: false,
        cupPath: true
    });

    if (!team) return null;

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // Use global currentRoundNumber if provided, fallback to navigation-based lookup
    const currentRoundNum = currentRoundNumber || rounds.find(r => {
        if (typeof selectedRoundId === 'number') return r.number === selectedRoundId;
        return r._id === selectedRoundId;
    })?.number || (rounds.length > 0 ? rounds[rounds.length - 1].number : 0);


    // Memoize basic team info
    const { teamName, teamId } = React.useMemo(() => ({
        teamName: team.name,
        teamId: team.id || team._id
    }), [team]);

    // Memoize h2h stats lookup with name fallback (crucial for Copa)
    const fullStats = React.useMemo(() => {
        let t = h2hStandings.find(st => st.id === teamId);
        if (!t && teamName) t = h2hStandings.find(st => st.name === teamName);
        return t || team;
    }, [h2hStandings, teamId, teamName, team]);

    const finalTeamId = fullStats?.id || fullStats?._id || teamId;

    // Next Opponent Logic
    const nextMatchData = React.useMemo(() => {
        if (!allRounds || allRounds.length === 0) return null;

        // Find the next round (first one that is 'future' or 'current')
        const nextRound = [...allRounds].sort((a, b) => a.number - b.number)
            .find(r => r.status === 'future' || r.status === 'current');

        if (!nextRound || !nextRound.matches) return null;

        const match = nextRound.matches.find(m => m.homeTeamId === teamId || m.awayTeamId === teamId);
        if (!match) return null;

        const isHome = String(match.homeTeamId) === String(teamId);
        const oppId = isHome ? match.awayTeamId : match.homeTeamId;
        const oppName = isHome ? match.awayName : match.homeName;
        const oppStats = h2hStandings.find(t => String(t.id) === String(oppId));

        return {
            roundNum: nextRound.number,
            opponentName: oppName,
            opponentId: oppId,
            opponentStats: oppStats,
            opponentPos: h2hStandings.findIndex(t => t.id === oppId) + 1,
            opponentTotalPts: oppStats ? (oppStats.points + (oppStats.hist_pts || 0)) : 0,
            opponentTotalGen: oppStats ? (oppStats.gf + (oppStats.hist_gen || 0)) : 0,
            isHome
        };
    }, [allRounds, teamId, h2hStandings]);

    const { stats, infractions, activeSanctions, totalCopaSanctions } = React.useMemo(() => {
        const rawStats = sanctionsData.teamStats || {};
        const isCopa = championship?.type === 'copa';

        // 1. Try direct ID lookup
        let resolvedStats = rawStats[teamId];
        let resolvedId = teamId;

        // 2. Fallback: Search by name if ID lookup failed
        if (!resolvedStats && teamName) {
            resolvedStats = Object.values(rawStats).find(s => s.name === teamName);
            if (resolvedStats) {
                resolvedId = resolvedStats.id;
            }
        }

        // Aggregate Copa Sanctions if available
        const teamCopaStats = (copaAnalysis?.teamStats?.[finalTeamId] ||
            Object.values(copaAnalysis?.teamStats || {}).find(s => s.name === teamName));
        const copaSanctionsValue = teamCopaStats?.total || 0;

        return {
            stats: resolvedStats || {},
            infractions: sanctionsData.infractions?.filter(inf => inf.teamId === resolvedId) || [],
            activeSanctions: sanctionsData.activeSanctions?.filter(s =>
                s.teamId === resolvedId && s.outTeamUntil >= currentRoundNum
            ) || [],
            totalCopaSanctions: copaSanctionsValue
        };
    }, [sanctionsData, teamId, teamName, currentRoundNum, copaAnalysis, finalTeamId, championship?.type]);

    // Retrieve last match data directly from the enriched team object
    const { lastLineup, lastScore, lastRoundNum } = React.useMemo(() => {
        const isCopa = championship?.type === 'copa';
        // Primary source for Copa: copaAnalysis. secondary source: fullStats
        const teamCopaStats = isCopa && (copaAnalysis?.teamStats?.[finalTeamId] ||
            Object.values(copaAnalysis?.teamStats || {}).find(s => s.name === teamName));

        const lastMatchData = (isCopa && teamCopaStats?.lastMatchData) || fullStats.lastMatchData;

        return {
            lastLineup: lastMatchData?.lineup || [],
            lastScore: lastMatchData?.score || 0,
            lastRoundNum: lastMatchData?.round || '--'
        };
    }, [championship?.type, copaAnalysis, finalTeamId, teamName, fullStats.lastMatchData]);

    const { totalPts, totalGen, position } = React.useMemo(() => ({
        totalPts: fullStats.points + (fullStats.hist_pts || 0),
        totalGen: fullStats.gf + (fullStats.hist_gen || 0),
        position: h2hStandings.findIndex(t => String(t.id) === String(teamId)) + 1
    }), [fullStats, h2hStandings, teamId]);

    // Define teamCopaData early so it can be used by last5Matches and cupPath
    const isCopa = championship?.type === 'copa';
    const teamCopaStats = isCopa && (copaAnalysis?.teamStats?.[finalTeamId] ||
        Object.values(copaAnalysis?.teamStats || {}).find(s => s.name === teamName));

    const teamCopaData = React.useMemo(() => {
        if (!isCopa || !copaAnalysis?.teamCopaStatus) return null;
        return copaAnalysis.teamCopaStatus[finalTeamId] ||
            Object.values(copaAnalysis.teamCopaStatus).find(s => s.name === teamName);
    }, [isCopa, copaAnalysis, finalTeamId, teamName]);

    const last5Matches = React.useMemo(() => {
        if (championship?.type === 'copa') {
            if (teamCopaData && teamCopaData.matchHistory) {
                // Use pre-calculated history from service which includes aggregated results
                // Copy and reverse to show latest first
                return [...teamCopaData.matchHistory].reverse().slice(0, 5);
            }
            return [];
        }
        return (fullStats.matchHistory || []).slice(0, 5);
    }, [championship?.type, teamCopaData, fullStats.matchHistory]);

    const getRoundTitle = (num) => {
        switch (num) {
            case 1: return '1/32 Final';
            case 2: return '1/16 Final';
            case 3: return 'Octavos';
            case 4: return 'Cuartos';
            case 5: return 'Semifinales';
            case 6: return 'Final';
            default: return `Ronda ${num}`;
        }
    };

    const cupPath = React.useMemo(() => {
        if (championship?.type !== 'copa' || !cupData) return null;
        const rawRounds = Array.isArray(cupData) ? cupData : (cupData?.rounds || []);

        // 1. Group pairings for each round to handle multi-leg gracefully
        const activeRounds = rawRounds
            .filter(r => r.matches && r.matches.length > 0)
            .sort((a, b) => a.number - b.number)
            .map(r => {
                const pairings = [];
                const seenPairs = new Set();

                (r.matches || []).forEach(m => {
                    const hName = m.home?.team?.name;
                    const aName = m.away?.team?.name;
                    const pairKey = [hName, aName].sort().join('|');

                    if (seenPairs.has(pairKey)) return;
                    seenPairs.add(pairKey);

                    const legs = (r.matches || []).filter(lm => {
                        const lh = lm.home?.team?.name;
                        const la = lm.away?.team?.name;
                        return [lh, la].sort().join('|') === pairKey;
                    });

                    pairings.push({
                        ...m,
                        legsCount: legs.length,
                        isMyPairing: hName === teamName || aName === teamName
                    });
                });

                return { ...r, pairings };
            });

        if (activeRounds.length === 0) return null;

        // 2. Find where the current team started
        let startRoundIdx = -1;
        let startPairIdx = -1;
        for (let i = 0; i < activeRounds.length; i++) {
            const pIdx = activeRounds[i].pairings.findIndex(p => p.isMyPairing);
            if (pIdx !== -1) {
                startRoundIdx = i;
                startPairIdx = pIdx;
                break;
            }
        }

        if (startPairIdx === -1) return null;

        const path = [];
        const numRounds = activeRounds.length;
        const startRoundNum = activeRounds[startRoundIdx].number;

        // If team didn't start in Round 1, add a note
        if (startRoundNum > 1) {
            path.push({
                roundNum: 0, // Special marker for "didn't participate"
                roundName: 'No participó en rondas anteriores',
                didNotParticipate: true,
                skippedRounds: Array.from({ length: startRoundNum - 1 }, (_, i) => i + 1)
            });
        }

        // 3. Trace the path forward
        let isEliminated = false;
        for (let k = 0; k < (numRounds - startRoundIdx); k++) {
            const roundIdx = startRoundIdx + k;
            const round = activeRounds[roundIdx];
            const pairIdx = Math.floor(startPairIdx / Math.pow(2, k));
            const pairing = round.pairings[pairIdx];

            if (!pairing) break;

            const isHome = pairing.home?.team?.name === teamName;
            const currentRivalName = isHome ? pairing.away?.team?.name : pairing.home?.team?.name;

            const historyEntry = teamCopaData?.matchHistory?.find(h => h.round === round.number);
            let resultStatus = 'neutral';
            if (historyEntry) {
                if (historyEntry.result === 'V') resultStatus = 'won';
                else if (historyEntry.result === 'D') {
                    resultStatus = 'lost';
                    isEliminated = true; // Mark as eliminated after a loss
                }
            }

            // Only calculate possible rivals if team is still active
            let possibleRivals = [];
            if (!isEliminated && resultStatus !== 'lost') {
                const rivalPairIdx = pairIdx ^ 1;
                const factor = Math.pow(2, k);
                const startRange = rivalPairIdx * factor;
                const endRange = startRange + factor;

                for (let j = startRange; j < endRange; j++) {
                    const basePairing = activeRounds[startRoundIdx].pairings[j];
                    if (basePairing) {
                        if (basePairing.home?.team?.name) possibleRivals.push(basePairing.home.team.name);
                        if (basePairing.away?.team?.name) possibleRivals.push(basePairing.away.team.name);
                    }
                }
                possibleRivals = Array.from(new Set(possibleRivals)).filter(rn => rn !== teamName && rn !== 'TBD' && rn !== 'LIBRE');
            }

            path.push({
                roundNum: round.number,
                roundName: getRoundTitle(round.number),
                currentRival: (currentRivalName && currentRivalName !== 'TBD' && currentRivalName !== 'LIBRE') ? currentRivalName : null,
                possibleRivals,
                isCurrent: round.number === currentRoundNum,
                resultStatus,
                scoreAgg: historyEntry?.scoreAgg,
                isEliminated: isEliminated && resultStatus === 'lost' // Mark this specific round as elimination round
            });

            // Stop showing future rounds after elimination
            if (isEliminated) break;
        }
        return path;
    }, [championship?.type, cupData, teamName, currentRoundNum, teamCopaData]);

    const teamStatus = React.useMemo(() => {
        if (!isCopa) return null;
        if (!teamCopaData) return 'Calculando...';
        if (teamCopaData.isEliminated) return teamCopaData.currentStage || 'Eliminado';
        return 'EN JUEGO';
    }, [isCopa, teamCopaData]);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <motion.div
                className="modal-content team-detail-card"
                onClick={e => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
                <button className="close-btn" onClick={onClose}><X size={20} /></button>

                {/* COMPACT REFINED HEADER */}
                <div className="team-detail-header-compact">
                    <div className="header-top">
                        <div className="team-detail-shield-small">
                            <motion.img
                                layoutId={`shield-${teamId || teamName}`}
                                src={getTeamShield(teamName)}
                                alt={teamName}
                            />
                        </div>
                        <div className="header-title-box">
                            <h2 className="team-detail-name">{teamName}</h2>
                            <div className="header-meta">
                                {!isCopa && <span className={`rank-badge pos-${position}`}>Posición #{position || '--'}</span>}
                                <span className="league-badge">
                                    {isCopa ? 'Copa Piraña' : 'Liga Fuentmondo'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="header-stats-row">
                        {!isCopa && (
                            <>
                                <div className="stat-group">
                                    <span className="label">PUNTOS TOTAL</span>
                                    <span className="value">{totalPts}</span>
                                </div>
                                <div className="stat-group accent">
                                    <span className="label">PUNTOS GENERAL</span>
                                    <span className="value">{totalGen}</span>
                                </div>
                            </>
                        )}
                        {isCopa && (
                            <>
                                <div className="stat-group">
                                    <span className="label">ESTADO COPA</span>
                                    <span className="value" style={{ color: teamStatus === 'Eliminado' ? '#ef4444' : '#10b981' }}>
                                        {teamStatus || '---'}
                                    </span>
                                </div>
                                <div className="stat-group">
                                    <span className="label">SANCIONES TOTALES</span>
                                    <span className="value" style={{ color: '#ef4444' }}>{(stats?.total || 0) + totalCopaSanctions}€</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="team-detail-scroll-area">
                    {/* 1. RESUMEN LIGA & RACHA (TOP - NON-COLLAPSIBLE) */}
                    <div className="detail-grid-two-cols">
                        <div className="detail-section-static">
                            <div className="section-static-header">
                                {isCopa ? <Activity size={18} /> : <Trophy size={18} />}
                                <span>{isCopa ? 'Estadísticas Copa' : 'Resumen de Liga'}</span>
                            </div>
                            <div className="static-content-inner stats-grid-mini">
                                {isCopa ? (
                                    <>
                                        <div className="stat-row"><span>Estado</span> <strong>{teamStatus || 'Cargando...'}</strong></div>
                                        <div className="stat-row"><span>Sanciones</span> <strong style={{ color: '#fca5a5' }}>{teamCopaStats?.total || 0}€</strong></div>
                                    </>
                                ) : (
                                    <>
                                        <div className="stat-row"><span>1ª Vuelta (Excel)</span> <strong>{fullStats.hist_pts || 0} pts</strong></div>
                                        <div className="stat-row"><span>2ª Vuelta (API)</span> <strong>{fullStats.points || 0} pts</strong></div>
                                        <div className="stat-row"><span>Partidos Jugados</span> <strong>{fullStats.played || 0}</strong></div>
                                        <div className="stat-row"><span>V - E - D</span> <strong>{fullStats.won || 0}-{fullStats.drawn || 0}-{fullStats.lost || 0}</strong></div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="detail-section-static">
                            <div className="section-static-header">
                                <Activity size={18} />
                                <span>Racha Actual</span>
                            </div>
                            <div className="static-content-inner form-container-v2">
                                <div className="form-shields-row">
                                    {last5Matches.map((m, i) => (
                                        <div key={i} className="form-shield-item">
                                            <img src={getTeamShield(m.opponentName)} alt={m.opponentName} className="history-shield" />
                                        </div>
                                    ))}
                                </div>
                                <div className="form-results-row">
                                    {last5Matches.map((m, i) => (
                                        <div key={i} className={`form-symbol-v2 result-${m.result}`}>
                                            {m.result}
                                        </div>
                                    ))}
                                    {isCopa && last5Matches.length === 0 && <p className="no-data-text" style={{ fontSize: '0.8rem', opacity: 0.5 }}>Actualización al finalizar ronda</p>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. ULTIMA ALINEACION (COLLAPSIBLE) */}
                    <div className="detail-section-collapsible">
                        <div className="section-trigger" onClick={() => toggleSection('lineup')}>
                            <div className="label-with-icon">
                                <User size={18} />
                                <span>{isCopa ? `Alineación Ronda ${lastRoundNum}` : `Alineación Jornada J${lastRoundNum}`}</span>
                            </div>
                            <div className="trigger-right">
                                {expandedSections.lineup ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>
                        </div>
                        {expandedSections.lineup && (
                            <div className="section-content-inner animate-slide-down">
                                <div className="pitch-wrapper-mini">
                                    {lastLineup && lastLineup.length > 0 ? (
                                        <SoccerPitch players={lastLineup} compact={true} />
                                    ) : (
                                        <div className="no-data-notice" style={{ minHeight: '300px', display: 'flex', alignItems: 'center' }}>
                                            <Loader2 className="animate-spin" size={20} />
                                            <p>Cargando alineación táctica...</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 3. PROXIMO RIVAL (COLLAPSIBLE) */}
                    {nextMatchData && (
                        <div className="detail-section-collapsible">
                            <div className="section-trigger" onClick={() => toggleSection('nextOpponent')}>
                                <div className="label-with-icon">
                                    <Activity size={18} />
                                    <span>Próximo Rival</span>
                                    <div className="rival-trigger-badge">
                                        <img src={getTeamShield(nextMatchData.opponentName)} alt="" className="micro-shield" />
                                        <span>J{nextMatchData.roundNum}</span>
                                    </div>
                                </div>
                                <div className="trigger-right">
                                    {expandedSections.nextOpponent ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </div>
                            </div>
                            {expandedSections.nextOpponent && (
                                <div className="section-content-inner animate-slide-down">
                                    <div className="opponent-detail-box">
                                        <div className="opponent-info-header">
                                            <img src={getTeamShield(nextMatchData.opponentName)} alt="" className="med-shield" />
                                            <div className="opp-meta">
                                                <div className="opp-name-row">
                                                    <h4>{nextMatchData.opponentName}</h4>
                                                    <span className={`opp-pos-badge pos-${nextMatchData.opponentPos}`}>#{nextMatchData.opponentPos}</span>
                                                </div>
                                                <div className="opp-stats-pills">
                                                    <div className="opp-pill">
                                                        <span>TOTAL</span>
                                                        <strong>{nextMatchData.opponentTotalPts}</strong>
                                                    </div>
                                                    <div className="opp-pill accent">
                                                        <span>GEN</span>
                                                        <strong>{nextMatchData.opponentTotalGen}</strong>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="pitch-wrapper-mini opp-pitch">
                                            {nextMatchData.opponentStats?.lastMatchData?.lineup ? (
                                                <SoccerPitch players={nextMatchData.opponentStats.lastMatchData.lineup} compact={true} />
                                            ) : (
                                                <p className="no-data-text">Cargando alineación del rival...</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3.5 CAMINO A LA COPA (NEW SECTION) */}
                    {cupPath && (
                        <div className="detail-section-collapsible cup-path-section">
                            <div className="section-trigger" onClick={() => toggleSection('cupPath')}>
                                <div className="label-with-icon">
                                    <Trophy size={18} />
                                    <span>El Camino a la Copa</span>
                                </div>
                                <div className="trigger-right">
                                    {expandedSections.cupPath ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </div>
                            </div>
                            {expandedSections.cupPath && (
                                <div className="section-content-inner animate-slide-down">
                                    <div className="cup-path-timeline">
                                        {cupPath.map((r, i) => (
                                            <div key={i} className={`cup-path-round ${r.didNotParticipate ? 'did-not-participate' : ''} ${r.isCurrent ? 'current' : ''} ${r.resultStatus ? 'status-' + r.resultStatus : ''}`}>
                                                <div className="round-marker"></div>
                                                <div className="round-details">
                                                    {r.didNotParticipate ? (
                                                        <div className="round-header" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            <span className="round-name" style={{ fontStyle: 'italic', opacity: 0.7 }}>{r.roundName}</span>
                                                            <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>
                                                                (Exento de {r.skippedRounds?.map((rn, idx) => `Ronda ${rn}`).join(', ')})
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="round-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <span className="round-name">{r.roundName}</span>
                                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                                    {r.scoreAgg && (
                                                                        <span className="score-badge" style={{
                                                                            fontSize: '0.75rem',
                                                                            fontWeight: 'bold',
                                                                            background: 'rgba(255,255,255,0.1)',
                                                                            padding: '2px 6px',
                                                                            borderRadius: '4px'
                                                                        }}>
                                                                            {r.scoreAgg}
                                                                        </span>
                                                                    )}
                                                                    {r.isCurrent && <span className="current-badge">ACTUAL</span>}
                                                                </div>
                                                            </div>
                                                            <div className="rivals-container">
                                                                {r.currentRival ? (
                                                                    <div className="confirmed-rival">
                                                                        <span className="rival-label">Rival:</span>
                                                                        <div className="rival-chip">
                                                                            <img src={getTeamShield(r.currentRival)} alt="" className="micro-shield" />
                                                                            <span>{r.currentRival}</span>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="possible-rivals">
                                                                        <span className="rival-label">Posibles Rivales:</span>
                                                                        <div className="rival-grid-mini">
                                                                            {r.possibleRivals.map((pr, idx) => (
                                                                                <div key={idx} className="rival-chip mini" title={pr}>
                                                                                    <img src={getTeamShield(pr)} alt="" className="micro-shield" />
                                                                                    <span className="hide-mobile">{pr}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 4. DISCIPLINA & HISTORIAL CAPITANES (SIDE BY SIDE COLLAPSIBLE) */}
                    <div className="detail-grid-two-cols">
                        {!isCopa && (
                            <div className="detail-section-collapsible">
                                <div className="section-trigger" onClick={() => toggleSection('discipline')}>
                                    <div className="label-with-icon">
                                        <AlertTriangle size={18} />
                                        <span>Disciplina</span>
                                    </div>
                                    {expandedSections.discipline ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </div>
                                {expandedSections.discipline && (
                                    <div className="section-content-inner sanctions-list-mini">
                                        <div className="sub-header-mini">Sanciones Activas</div>
                                        {activeSanctions.length > 0 ? activeSanctions.map((s, i) => (
                                            <div key={i} className="sanction-tag">
                                                <strong>{s.player}</strong>: Fuera hasta J{s.outTeamUntil}
                                            </div>
                                        )) : <p className="empty-text">Sin sanciones activas</p>}

                                        <div className="sub-header-mini mt-2">Infracciones</div>
                                        <div className="inf-scroll-box">
                                            {infractions.length > 0 ? infractions.map((inf, i) => (
                                                <div key={i} className="inf-mini-line">
                                                    <span>J{inf.round} - {inf.type}</span>
                                                    <span className="cost">{inf.cost}€</span>
                                                </div>
                                            )) : <p className="empty-text">Sin infracciones.</p>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="detail-section-collapsible">
                            <div className="section-trigger" onClick={() => toggleSection('captains')}>
                                <div className="label-with-icon">
                                    <History size={18} />
                                    <span>Capitanes</span>
                                </div>
                                {expandedSections.captains ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>
                            {expandedSections.captains && (
                                <div className="section-content-inner captains-history-box">
                                    <div className="captains-list-scroll">
                                        {((isCopa ? teamCopaStats?.captainHistory : (stats.captainHistory || []))).slice().reverse().map((h, i) => (
                                            <div key={i} className={`cap-history-row ${h.alert ? 'alert' : ''}`}>
                                                <span className="round">
                                                    {isCopa ? `R${h.round}` : `J${h.round}`}
                                                </span>
                                                <span className="name">{h.player}</span>
                                                <span className="count">
                                                    {isCopa ? (h.alert ? '⚠️' : '') : `x${h.count}`}
                                                </span>
                                            </div>
                                        ))}
                                        {!((isCopa ? teamCopaStats?.captainHistory : stats.captainHistory) || []).length && <p className="empty-text">Sin historial.</p>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default TeamDetailModal;
