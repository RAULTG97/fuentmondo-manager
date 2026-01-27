import React, { useState } from 'react';
import { X, Trophy, AlertTriangle, ShieldAlert, History, User, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { getTeamShield } from '../utils/assets';
import SoccerPitch from './SoccerPitch';
import './TeamDetailModal.css';

const TeamDetailModal = ({ team, h2hStandings, sanctionsData, rounds, selectedRoundId, onClose }) => {
    const [isLineupExpanded, setIsLineupExpanded] = useState(false);
    const [isCaptainHistoryExpanded, setIsCaptainHistoryExpanded] = useState(false);

    if (!team) return null;

    const currentRoundNum = rounds.find(r => r._id === selectedRoundId)?.number || (rounds.length > 0 ? rounds[rounds.length - 1].number : 0);


    // Use canonical name for all lookups
    const teamName = team.name;
    const teamId = team.id || team._id;

    // Get full stats from h2hStandings (which is already aggregated)
    const fullStats = h2hStandings.find(t => t.id === teamId) || team;

    const stats = sanctionsData.teamStats?.[teamId] || {};
    const infractions = sanctionsData.infractions?.filter(inf => inf.teamId === teamId) || [];
    const activeSanctions = sanctionsData.activeSanctions?.filter(s => s.teamId === teamId) || [];

    // Retrieve last match data directly from the enriched team object (populated in Dashboard.jsx)
    const lastMatchData = fullStats.lastMatchData;
    const lastLineup = lastMatchData?.lineup || [];
    const lastScore = lastMatchData?.score || 0;
    const lastRoundNum = lastMatchData?.round || '--';

    const totalPts = fullStats.points + (fullStats.hist_pts || 0);
    const totalGen = fullStats.gf + (fullStats.hist_gen || 0);
    const position = h2hStandings.findIndex(t => t.id === teamId) + 1;

    return (
        <div className="modal-overlay fade-in" onClick={onClose}>
            <div className="modal-content team-detail-card" onClick={e => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}><X size={24} /></button>

                <div className="team-detail-header">
                    <div className="team-detail-shield-large">
                        <img src={getTeamShield(teamName)} alt={teamName} />
                    </div>
                    <div className="header-info-main">
                        <h2 className="team-detail-name">{teamName}</h2>
                        <div className="team-detail-rank-info">
                            <div className="stat-pill pos">
                                <span className="pill-label">PUESTO</span>
                                <span className="pill-val">#{position || '--'}</span>
                            </div>
                            <div className="stat-pill pts">
                                <span className="pill-label">PUNTOS</span>
                                <span className="pill-val">{totalPts}</span>
                            </div>
                            <div className="stat-pill gen">
                                <span className="pill-label">GENERAL</span>
                                <span className="pill-val">{totalGen}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="team-detail-grid">
                    {/* Last Match Encounter - Now with Soccer Pitch - COLLAPSIBLE */}
                    <div className="detail-section lineup-pitch-section full-width">
                        <div
                            className="section-header-flex clickable"
                            onClick={() => setIsLineupExpanded(!isLineupExpanded)}
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                        >
                            <h4><User size={18} /> Última Alineación (J{lastRoundNum})</h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div className="lineup-score-box">
                                    Puntos Jornada: <span className="score-val">{lastScore}</span>
                                </div>
                                {isLineupExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>
                        </div>

                        {isLineupExpanded && (
                            <div className="compact-pitch-container">
                                {lastLineup && lastLineup.length > 0 ? (
                                    <SoccerPitch players={lastLineup} compact={true} />
                                ) : (
                                    <div className="no-data-notice">
                                        <Loader2 className="animate-spin" size={20} />
                                        <p>Cargando alineación táctica...</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Left Column: Stats & Sanctions */}
                    <div className="detail-col">
                        <div className="detail-section stats-summary mb-1">
                            <h4><ShieldAlert size={18} /> Resumen de Liga</h4>
                            <div className="stats-grid">
                                <div className="stat-item"><span>1ª Vuelta (Excel)</span> <strong>{fullStats.hist_pts} pts</strong></div>
                                <div className="stat-item"><span>2ª Vuelta (API)</span> <strong>{fullStats.points} pts</strong></div>
                                <div className="stat-item"><span>Partidos Jugados</span> <strong>{fullStats.played}</strong></div>
                                <div className="stat-item"><span>V - E - D</span> <strong className="record">{fullStats.won} - {fullStats.drawn} - {fullStats.lost}</strong></div>
                            </div>
                        </div>

                        <div className="detail-section sanctions-infractions">
                            <h4><AlertTriangle size={18} /> Disciplina</h4>
                            <div className="sub-section">
                                <h5>Sanciones Activas</h5>
                                {activeSanctions.length > 0 ? activeSanctions.map((s, i) => {
                                    const isActive = s.noCaptUntil >= currentRoundNum;
                                    return (
                                        <div key={i} className={`active-sanction-tag ${!isActive ? 'completed' : ''}`}>
                                            <strong>{s.player}</strong>: Fuera hasta J{s.outTeamUntil}, No cap. hasta J{s.noCaptUntil}
                                        </div>
                                    );
                                }) : <p className="empty-text">Sin sanciones activas</p>}

                            </div>

                            <div className="sub-section mt-2">
                                <h5>Infracciones ({infractions.reduce((acc, i) => acc + (i.cost || 0), 0)}€)</h5>
                                <div className="scroll-y inf-mini-scroll">
                                    {infractions.length > 0 ? infractions.map((inf, i) => (
                                        <div key={i} className="inf-mini-item">
                                            <span>J{inf.round} - {inf.type}</span>
                                            <span className="inf-cost">{inf.cost}€</span>
                                        </div>
                                    )) : <p className="empty-text">Sin infracciones</p>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Captains - COLLAPSIBLE */}
                    <div className="detail-col">
                        <div className="detail-section captain-history h-100">
                            <div
                                className="section-header-flex clickable"
                                onClick={() => setIsCaptainHistoryExpanded(!isCaptainHistoryExpanded)}
                                style={{ cursor: 'pointer', userSelect: 'none', marginBottom: isCaptainHistoryExpanded ? '1rem' : '0' }}
                            >
                                <h4><History size={18} /> Historial de Capitanes</h4>
                                {isCaptainHistoryExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>

                            {isCaptainHistoryExpanded && (
                                <div className="scroll-y history-list-tall">
                                    {(stats.captainHistory || []).slice().reverse().map((h, i) => (
                                        <div key={i} className={`history-item-new ${h.alert ? 'alert' : ''}`}>
                                            <div className="hist-round">J{h.round}</div>
                                            <div className="hist-name">{h.player}</div>
                                            <div className="hist-count">x{h.count}</div>
                                        </div>
                                    ))}
                                    {(!stats.captainHistory || stats.captainHistory.length === 0) && <p className="empty-text">Sin historial registrado.</p>}
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
