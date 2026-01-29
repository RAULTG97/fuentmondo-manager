import { useState, useEffect } from 'react';
import { X, Shirt, Crown, Laugh } from 'lucide-react';
import { getInternalLineup } from '../services/api';
import SoccerPitch from './SoccerPitch';
import MatchShareCard from './MatchShareCard';
import { getTeamShield } from '../utils/assets';
import Confetti from './Confetti';
import './MatchDetail.css';

function MatchDetail({ match, championshipId, roundId, onClose }) {
    const [lineupHome, setLineupHome] = useState(null);
    const [lineupAway, setLineupAway] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [showShare, setShowShare] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Helper to extract clean lineup array
    const extractPlayers = (data) => {
        if (!data) return [];
        if (data.players && data.players.initial) return data.players.initial;
        if (Array.isArray(data.players)) return data.players;
        if (Array.isArray(data.lineup)) return data.lineup;
        return [];
    };

    useEffect(() => {
        if (!match || !championshipId || !roundId) return;

        const idA = match.homeTeamId || match.p[0];
        const idB = match.awayTeamId || match.p[1];

        if (!idA || !idB) return;

        setLoading(true);

        Promise.all([
            getInternalLineup(championshipId, idA, roundId),
            getInternalLineup(championshipId, idB, roundId)
        ]).then(([resHome, resAway]) => {
            setLineupHome(extractPlayers(resHome));
            setLineupAway(extractPlayers(resAway));
            setLoading(false);
        }).catch(err => {
            console.error("Error fetching match detail lineups:", err);
            setLoading(false);
        });

    }, [match, championshipId, roundId]);

    // Calculated Scores (Live)
    const homePoints = lineupHome ? lineupHome.reduce((acc, p) => acc + (p.points || 0), 0) : (match.homeScore || 0);
    const awayPoints = lineupAway ? lineupAway.reduce((acc, p) => acc + (p.points || 0), 0) : (match.awayScore || 0);

    // Determine winner for confetti
    const hasWinner = homePoints !== awayPoints;
    const showConfetti = !loading && hasWinner;

    if (!match) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <Confetti active={showConfetti} />

            <div className="match-detail-card" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="match-detail-header">
                    <h3>Detalle del Enfrentamiento</h3>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                        </div>
                        {homePoints > awayPoints && <span className="winner-label">Ganador</span>}
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
                        </div>
                        {awayPoints > homePoints && <span className="winner-label">Ganador</span>}
                    </div>
                </div>

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
