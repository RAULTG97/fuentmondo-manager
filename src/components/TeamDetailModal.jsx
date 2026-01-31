import React, { useState } from 'react';
import { X, Trophy, AlertTriangle, History, User, Loader2, ChevronDown, ChevronUp, Activity } from 'lucide-react';
import { getTeamShield } from '../utils/assets';
import SoccerPitch from './SoccerPitch';
import './TeamDetailModal.css';

const TeamDetailModal = ({ team, championship, h2hStandings, sanctionsData, rounds, allRounds, selectedRoundId, currentRoundNumber, onClose }) => {
    const [expandedSections, setExpandedSections] = useState({
        lineup: false,
        nextOpponent: false,
        discipline: false,
        captains: false
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

    // Memoize h2h stats lookup
    const fullStats = React.useMemo(() =>
        h2hStandings.find(t => t.id === teamId) || team
        , [h2hStandings, teamId, team]);

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

    const { stats, infractions, activeSanctions } = React.useMemo(() => ({
        stats: sanctionsData.teamStats?.[teamId] || {},
        infractions: sanctionsData.infractions?.filter(inf => inf.teamId === teamId) || [],
        activeSanctions: sanctionsData.activeSanctions?.filter(s =>
            s.teamId === teamId && s.outTeamUntil >= currentRoundNum
        ) || []
    }), [sanctionsData, teamId, currentRoundNum]);

    // Retrieve last match data directly from the enriched team object
    const { lastLineup, lastScore, lastRoundNum } = React.useMemo(() => {
        const lastMatchData = fullStats.lastMatchData;
        return {
            lastLineup: lastMatchData?.lineup || [],
            lastScore: lastMatchData?.score || 0,
            lastRoundNum: lastMatchData?.round || '--'
        };
    }, [fullStats.lastMatchData]);

    const { totalPts, totalGen, position } = React.useMemo(() => ({
        totalPts: fullStats.points + (fullStats.hist_pts || 0),
        totalGen: fullStats.gf + (fullStats.hist_gen || 0),
        position: h2hStandings.findIndex(t => t.id === teamId) + 1
    }), [fullStats, h2hStandings, teamId]);

    const last5Matches = (fullStats.matchHistory || []).slice(0, 5);

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
                                <span className={`rank-badge pos-${position}`}>Posición #{position || '--'}</span>
                                <span className="league-badge">
                                    {championship?.type === 'copa' ? 'Copa Piraña' : 'Liga Fuentmondo'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="header-stats-row">
                        <div className="stat-group">
                            <span className="label">PUNTOS TOTAL</span>
                            <span className="value">{totalPts}</span>
                        </div>
                        <div className="stat-group accent">
                            <span className="label">PUNTOS GENERAL</span>
                            <span className="value">{totalGen}</span>
                        </div>
                    </div>
                </div>

                <div className="team-detail-scroll-area">
                    {/* 1. RESUMEN LIGA & RACHA (TOP - NON-COLLAPSIBLE) */}
                    <div className="detail-grid-two-cols">
                        <div className="detail-section-static">
                            <div className="section-static-header">
                                {championship?.type === 'copa' ? <Activity size={18} /> : <Trophy size={18} />}
                                <span>{championship?.type === 'copa' ? 'Estadísticas Copa' : 'Resumen de Liga'}</span>
                            </div>
                            <div className="static-content-inner stats-grid-mini">
                                {championship?.type === 'copa' ? (
                                    <>
                                        <div className="stat-row"><span>Estado</span> <strong>Participante</strong></div>
                                        <div className="stat-row"><span>Puntos Global</span> <strong>{totalPts} pts</strong></div>
                                        <div className="stat-row"><span>Sanciones</span> <strong style={{ color: '#fca5a5' }}>{fullStats.total || 0}€</strong></div>
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
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. ULTIMA ALINEACION (COLLAPSIBLE) */}
                    <div className="detail-section-collapsible">
                        <div className="section-trigger" onClick={() => toggleSection('lineup')}>
                            <div className="label-with-icon">
                                <User size={18} />
                                <span>Alineación {championship?.type === 'copa' ? `Ronda ${lastRoundNum}` : `Jornada J${lastRoundNum}`}</span>
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

                    {/* 4. DISCIPLINA & HISTORIAL CAPITANES (SIDE BY SIDE COLLAPSIBLE) */}
                    <div className="detail-grid-two-cols">
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
                                        {(stats.captainHistory || []).slice().reverse().map((h, i) => (
                                            <div key={i} className={`cap-history-row ${h.alert ? 'alert' : ''}`}>
                                                <span className="round">
                                                    {championship?.type === 'copa' ? `R${h.round}` : `J${h.round}`}
                                                </span>
                                                <span className="name">{h.player}</span>
                                                <span className="count">x{h.count}</span>
                                            </div>
                                        ))}
                                        {(!stats.captainHistory || stats.captainHistory.length === 0) && <p className="empty-text">Sin historial.</p>}
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
