import { useState, useEffect } from 'react';
import { X, Shirt, Crown, Laugh } from 'lucide-react';
import { getInternalLineup } from '../services/api';
import SoccerPitch from './SoccerPitch';
import MatchShareCard from './MatchShareCard';
import { getTeamShield } from '../utils/assets';
import Confetti from './Confetti';
import { calcLineupPenalty } from '../utils/LineupPenaltyCalculator';
import './MatchDetail.css';

function MatchDetail({ match, championshipId, roundId, onClose }) {
    const [lineupHome, setLineupHome] = useState(null);
    const [lineupAway, setLineupAway] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [showShare, setShowShare] = useState(false);

    // Support for multiple legs
    const roundIds = Array.isArray(roundId) ? roundId : [roundId];
    const [activeLegIdx, setActiveLegIdx] = useState(0);
    const activeRoundId = roundIds[activeLegIdx];

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);

        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('resize', handleResize);
            document.body.style.overflow = 'unset';
        };
    }, []);

    // Helper to extract clean lineup array
    const extractPlayers = (data) => {
        if (!data) return [];
        if (Array.isArray(data)) return data;

        if (data.players && data.players.initial && Array.isArray(data.players.initial)) return data.players.initial;
        if (data.players && Array.isArray(data.players)) return data.players;
        if (data.lineup && Array.isArray(data.lineup)) return data.lineup;

        // Fallback: if it has common player props but is inside another object
        if (typeof data === 'object' && !Array.isArray(data)) {
            const values = Object.values(data);
            const arrayMatch = values.find(val => Array.isArray(val) && val.length > 0 && (val[0].name || val[0].playerName));
            if (arrayMatch) return arrayMatch;
        }

        return [];
    };

    useEffect(() => {

        if (!match || !championshipId || !activeRoundId) {
            setLoading(false); // vital to stop "Cargando..."
            return;
        }

        // Normalize inputs for League vs Copa
        // Copa structure: match.home.team.id OR match.home.team._id
        // League structure: match.homeTeamId or match.p?.[0]

        // Try extracting from Copa structure first (deep access)
        const homeTeamObj = match.home?.team;
        const awayTeamObj = match.away?.team;

        let idA = homeTeamObj?.id || homeTeamObj?._id || match.homeTeamId || match.p?.[0];
        let idB = awayTeamObj?.id || awayTeamObj?._id || match.awayTeamId || match.p?.[1];

        if (!idA || !idB) {
            setLoading(false);
            return;
        }

        setLoading(true);

        Promise.all([
            getInternalLineup(championshipId, idA, activeRoundId),
            getInternalLineup(championshipId, idB, activeRoundId)
        ]).then(([resHome, resAway]) => {
            setLineupHome(extractPlayers(resHome));
            setLineupAway(extractPlayers(resAway));
            setLoading(false);
        }).catch(err => {
            console.error("Error fetching match detail lineups:", err);
            setLoading(false);
        });

    }, [match, championshipId, activeRoundId]);

    // Calculated Scores (Leg specific — raw points from lineup)
    const homeRaw = lineupHome ? lineupHome.reduce((acc, p) => acc + (p.points || 0), 0) : (match.home?.scores?.[activeLegIdx] || 0);
    const awayRaw = lineupAway ? lineupAway.reduce((acc, p) => acc + (p.points || 0), 0) : (match.away?.scores?.[activeLegIdx] || 0);

    // Lineup incompleteness penalty (only when we have the actual lineup)
    const { penaltyPoints: homePen, missingPlayers: homeMissing } = lineupHome
        ? calcLineupPenalty(lineupHome)
        : { penaltyPoints: 0, missingPlayers: 0 };
    const { penaltyPoints: awayPen, missingPlayers: awayMissing } = lineupAway
        ? calcLineupPenalty(lineupAway)
        : { penaltyPoints: 0, missingPlayers: 0 };

    const homePoints = homeRaw + homePen;
    const awayPoints = awayRaw + awayPen;

    // Aggregated Score
    const homeTotal = match.home?.scores?.reduce((a, b) => a + b, 0) || (match.homeScore || 0);
    const awayTotal = match.away?.scores?.reduce((a, b) => a + b, 0) || (match.awayScore || 0);

    // Determine winner for confetti
    const hasWinner = homePoints !== awayPoints;
    const showConfetti = !loading && hasWinner;

    if (!match) return null;

    return (
        <div className="match-detail-overlay" onClick={onClose}>
            <Confetti active={showConfetti} />

            <div className="match-detail-card modal-content-animate" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="match-detail-header">
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <h3>Detalle del Enfrentamiento</h3>
                        {roundIds.length > 1 && (
                            <div className="leg-selector">
                                {roundIds.map((_, idx) => (
                                    <button
                                        key={idx}
                                        className={`leg-btn ${activeLegIdx === idx ? 'active' : ''}`}
                                        onClick={() => setActiveLegIdx(idx)}
                                    >
                                        Partido {idx + 1}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                        <button onClick={() => setShowShare(true)} className="share-btn-action-meme" title="Generar Crónica">
                            <span className="meme-btn-text">Crónica</span>
                            <span className="meme-btn-emoji">📰</span>
                        </button>
                        <button onClick={onClose} className="close-btn-red">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Scoreboard - Sticky */}
                <div className="scoreboard-sticky">
                    <div className="team-score-section">
                        <div className="team-info-compact">
                            <img
                                src={getTeamShield(match.homeName)}
                                className="team-shield-score"
                                onError={(e) => e.target.style.display = 'none'}
                                alt=""
                            />
                            {match.homeName}
                        </div>
                        <div className={`score-display ${homePoints > awayPoints ? 'score-winner' : ''}`}>
                            {homePoints}
                            {roundIds.length > 1 && <span className="score-total-badge">Total: {homeTotal}</span>}
                        </div>
                        {homeMissing > 0 && (
                            <div className="lineup-penalty-detail">
                                <span className="penalty-icon">⚠️</span>
                                <span>{homeMissing} jugador(es) faltante(s)</span>
                                <span className="penalty-pts">-{homeMissing * 5} pts</span>
                            </div>
                        )}
                        {homePoints > awayPoints && <span className="winner-label">Ganador Partido</span>}
                    </div>

                    <div className="match-vs-divider">VS</div>

                    <div className="team-score-section">
                        <div className="team-info-compact">
                            <img
                                src={getTeamShield(match.awayName)}
                                className="team-shield-score"
                                onError={(e) => e.target.style.display = 'none'}
                                alt=""
                            />
                            {match.awayName}
                        </div>
                        <div className={`score-display ${awayPoints > homePoints ? 'score-winner' : ''}`}>
                            {awayPoints}
                            {roundIds.length > 1 && <span className="score-total-badge">Total: {awayTotal}</span>}
                        </div>
                        {awayMissing > 0 && (
                            <div className="lineup-penalty-detail">
                                <span className="penalty-icon">⚠️</span>
                                <span>{awayMissing} jugador(es) faltante(s)</span>
                                <span className="penalty-pts">-{awayMissing * 5} pts</span>
                            </div>
                        )}
                        {awayPoints > homePoints && <span className="winner-label">Ganador Partido</span>}
                    </div>
                </div>

                {/* Penalty Banner (if any team is incomplete) */}
                {(homeMissing > 0 || awayMissing > 0) && (
                    <div className="lineup-penalty-banner">
                        <span className="penalty-banner-icon">⚠️</span>
                        <div className="penalty-banner-text">
                            <strong>LEY ENIGMA: Alineación Incompleta</strong>
                            {homeMissing > 0 && (
                                <span>{match.homeName}: {homeMissing} enigma(s) detectado(s) → <strong>-{homeMissing * 5} pts</strong></span>
                            )}
                            {awayMissing > 0 && (
                                <span>{match.awayName}: {awayMissing} enigma(s) detectado(s) → <strong>-{awayMissing * 5} pts</strong></span>
                            )}
                        </div>
                    </div>
                )}

                {/* Content Area - Scrollable */}
                <div className="lineups-scroll-area">
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Cargando alineaciones...</div>
                    ) : (
                        <div className="lineups-container">
                            <div className="lineup-column">
                                <h4 className="lineup-title">Alineación Local</h4>
                                {lineupHome ? <SoccerPitch players={lineupHome} compact={isMobile} /> : <div>Sin alineación</div>}
                            </div>

                            <div className="lineup-column">
                                <h4 className="lineup-title">Alineación Visitante</h4>
                                {lineupAway ? <SoccerPitch players={lineupAway} compact={isMobile} /> : <div>Sin alineación</div>}
                            </div>
                        </div>
                    )}
                </div>

                {showShare && (
                    <MatchShareCard
                        match={{
                            homeTeam: match.homeName,
                            awayTeam: match.awayName,
                            homeScore: homePoints,
                            awayScore: awayPoints,
                            roundName: match.roundName
                        }}
                        onClose={() => setShowShare(false)}
                    />
                )}
            </div>
        </div>
    );
}

export default MatchDetail;
