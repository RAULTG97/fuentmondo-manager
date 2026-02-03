import React, { useState } from 'react';
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

        const isHome = match.homeTeamId === teamId;
        const oppId = isHome ? match.awayTeamId : match.homeTeamId;
        const oppName = isHome ? match.awayName : match.homeName;
        const oppStats = h2hStandings.find(t => t.id === oppId);

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

    const { stats, infractions, activeSanctions } = React.useMemo(() => {
        const rawStats = sanctionsData.teamStats || {};
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

        return {
            stats: resolvedStats || {},
            infractions: sanctionsData.infractions?.filter(inf => inf.teamId === resolvedId) || [],
            activeSanctions: sanctionsData.activeSanctions?.filter(s =>
                s.teamId === resolvedId && s.outTeamUntil >= currentRoundNum
            ) || []
        };
    }, [sanctionsData, teamId, teamName, currentRoundNum]);

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
        position: h2hStandings.findIndex(t => t.id === teamId) + 1
    }), [fullStats, h2hStandings, teamId]);

    const last5Matches = React.useMemo(() => {
        if (championship?.type === 'copa') {
            if (!cupData) return [];
            const rawRounds = Array.isArray(cupData) ? cupData : (cupData?.rounds || []);
            const history = [];

            // Sort rounds by number ascending to process matches in order
            const sortedRounds = [...rawRounds].sort((a, b) => a.number - b.number);

            sortedRounds.forEach(r => {
                const matches = r.matches || [];
                matches.forEach(m => {
                    const homeName = m.home?.team?.name;
                    const awayName = m.away?.team?.name;
                    const isHome = homeName === teamName;
                    const isAway = awayName === teamName;

                    if (isHome || isAway) {
                        // Extract scores
                        const getSideScore = (side) => {
                            if (!side) return 0;
                            if (Array.isArray(side.scores) && side.scores.length > 0) {
                                return side.scores.reduce((a, b) => a + b, 0);
                            }
                            return side.score || 0;
                        };

                        const myScore = isHome ? getSideScore(m.home) : getSideScore(m.away);
                        const oppScore = isHome ? getSideScore(m.away) : getSideScore(m.home);
                        const oppName = isHome ? awayName : homeName;

                        // Check for valid score data
                        const homeHasScore = (m.home?.scores && m.home.scores.length > 0) || m.home?.score !== undefined;
                        const awayHasScore = (m.away?.scores && m.away.scores.length > 0) || m.away?.score !== undefined;
                        const hasMetrics = homeHasScore && awayHasScore;

                        // Loose check for "finished": if it has scores and is not explicitly non-finished state
                        // or if round is past.
                        // IMPORTANT: For Copa, often 'status' is missing or ambiguous. Presence of scores usually means played.
                        // We filter out only if it's explicitly 'scheduled' or 'live' with no scores.
                        const isFinished =
                            (m.status === 'finished') ||
                            (r.status === 'past') ||
                            (hasMetrics && m.status !== 'scheduled' && m.status !== 'live');

                        if (isFinished && oppName && oppName !== 'TBD') {
                            let result = 'E';
                            if (myScore > oppScore) result = 'V';
                            else if (myScore < oppScore) result = 'D';

                            history.push({
                                result,
                                opponentName: oppName,
                                round: r.number
                            });
                        }
                    }
                });
            });

            // Return last 5, reversed so most recent is first
            return history.reverse().slice(0, 5);
        }
        return (fullStats.matchHistory || []).slice(0, 5);
    }, [championship?.type, cupData, teamName, fullStats.matchHistory]);

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
        const activeRounds = [...rawRounds]
            .filter(r => r.matches && r.matches.length > 0)
            .sort((a, b) => a.number - b.number);

        if (activeRounds.length === 0) return null;

        let startRoundIdx = -1;
        let startMatchIdx = -1;
        for (let i = 0; i < activeRounds.length; i++) {
            const mIdx = activeRounds[i].matches.findIndex(m =>
                m.home?.team?.name === teamName || m.away?.team?.name === teamName
            );
            if (mIdx !== -1) {
                startRoundIdx = i;
                startMatchIdx = mIdx;
                break;
            }
        }
        if (startMatchIdx === -1) return null;

        const path = [];
        const numRounds = activeRounds.length;

        for (let k = 0; k < (numRounds - startRoundIdx); k++) {
            const roundIdx = startRoundIdx + k;
            const round = activeRounds[roundIdx];
            const matchIdx = Math.floor(startMatchIdx / Math.pow(2, k));
            const match = round.matches[matchIdx];

            if (!match) break;

            const isHome = match.home?.team?.name === teamName;
            const isAway = match.away?.team?.name === teamName;

            const rivalMatchIdx = matchIdx ^ 1;
            const possibleRivals = [];
            const factor = Math.pow(2, k);
            const startRange = rivalMatchIdx * factor;
            const endRange = startRange + factor;

            for (let j = startRange; j < endRange; j++) {
                const baseMatch = activeRounds[startRoundIdx].matches[j];
                if (baseMatch) {
                    if (baseMatch.home?.team?.name) possibleRivals.push(baseMatch.home.team.name);
                    if (baseMatch.away?.team?.name) possibleRivals.push(baseMatch.away.team.name);
                }
            }

            path.push({
                roundNumber: round.number,
                roundName: getRoundTitle(round.number),
                currentRival: isHome ? (match.away?.team?.name || 'LIBRE') : (isAway ? (match.home?.team?.name || 'LIBRE') : null),
                possibleRivals: Array.from(new Set(possibleRivals)).filter(r => r !== teamName),
                isCurrent: (round.number === currentRoundNum),
                isConfirmed: (isHome || isAway)
            });
        }
        return path;
    }, [championship?.type, cupData, teamName, currentRoundNum]);

    const isCopa = championship?.type === 'copa';
    const teamCopaStats = isCopa && (copaAnalysis?.teamStats?.[finalTeamId] ||
        Object.values(copaAnalysis?.teamStats || {}).find(s => s.name === teamName));

    const teamStatus = React.useMemo(() => {
        if (!isCopa || !cupData) return null;
        const rawRounds = Array.isArray(cupData) ? cupData : (cupData?.rounds || []);

        // Find all matches of this team
        const allMyMatches = [];
        rawRounds.forEach(r => {
            const m = (r.matches || []).find(match => match.home?.team?.name === teamName || match.away?.team?.name === teamName);
            if (m) allMyMatches.push({ roundNum: r.number, match: m });
        });

        if (allMyMatches.length === 0) return 'Desconocido';

        // Sort by round number descending to get the latest match
        allMyMatches.sort((a, b) => b.roundNum - a.roundNum);
        const lastMatchInfo = allMyMatches[0];
        const m = lastMatchInfo.match;
        const isFinished = m.status === 'finished' || (m.homeScore !== undefined && m.awayScore !== undefined && m.status !== 'live');

        if (!isFinished) return 'Sigue en juego';

        // Check if won last match
        const isHome = m.home?.team?.name === teamName;
        const won = isHome ? (m.homeScore > m.awayScore) : (m.awayScore > m.homeScore);

        if (won) {
            // If it was the final, they are champion
            if (lastMatchInfo.roundNum === 6) return 'Campeón';
            return 'Sigue en juego';
        } else {
            return 'Eliminado';
        }
    }, [isCopa, cupData, teamName]);

    return (
        <div className="modal-overlay fade-in" onClick={onClose}>
            <div className="modal-content team-detail-card" onClick={e => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}><X size={24} /></button>

                {/* COMPACT REFINED HEADER */}
                <div className="team-detail-header-compact">
                    <div className="header-top">
                        <div className="team-detail-shield-small">
                            <img src={getTeamShield(teamName)} alt={teamName} />
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
                                    <span className="value" style={{ color: '#ef4444' }}>{teamCopaStats?.total || 0}€</span>
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
                                            <div key={i} className={`cup-path-round ${r.isCurrent ? 'current' : ''}`}>
                                                <div className="round-marker"></div>
                                                <div className="round-details">
                                                    <div className="round-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span className="round-name">{r.roundName}</span>
                                                        {r.isCurrent && <span className="current-badge">ACTUAL</span>}
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
                                        {((isCopa ? teamCopaStats?.captainHistory : stats.captainHistory) || []).slice().reverse().map((h, i) => (
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
            </div>
        </div>
    );
};

export default TeamDetailModal;
