import { useState, useEffect } from 'react';
import { X, Shirt, Crown } from 'lucide-react';
import { getInternalLineup } from '../services/api';
import SoccerPitch from './SoccerPitch';
import { getTeamShield } from '../utils/assets';
import Confetti from './Confetti';

function MatchDetail({ match, championshipId, roundId, onClose }) {
    const [lineupHome, setLineupHome] = useState(null);
    const [lineupAway, setLineupAway] = useState(null);
    const [loading, setLoading] = useState(true);

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

        // Prefer Real IDs mapped by parent, fallback to raw p IDs if strings (rare case?)
        // But p are indices [1, 20]. So we MUST use the mapped IDs.
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
    const homePoints = lineupHome ? lineupHome.reduce((acc, p) => acc + (p.points || 0), 0) : match.homeScore;
    const awayPoints = lineupAway ? lineupAway.reduce((acc, p) => acc + (p.points || 0), 0) : match.awayScore;

    // Determine winner for confetti
    const hasWinner = homePoints !== awayPoints;
    const showConfetti = !loading && hasWinner;

    if (!match) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            {/* Confetti Celebration */}
            <Confetti active={showConfetti} />

            <div className="modal-content" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid var(--glass-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'linear-gradient(to right, rgba(15, 23, 42, 0.9), transparent)'
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>
                        Detalle del Enfrentamiento
                    </h3>
                    <button
                        onClick={onClose}
                        className="close-btn"
                        style={{ position: 'relative', top: 'auto', right: 'auto', width: '36px', height: '36px' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scoreboard */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '2rem 1rem',
                    gap: '2rem',
                    background: 'rgba(0, 0, 0, 0.2)',
                    position: 'relative'
                }}>
                    {/* Home */}
                    <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '0.5rem',
                            color: 'var(--text-dim)'
                        }}>
                            <img
                                src={getTeamShield(match.homeName)}
                                style={{ width: '48px', height: '48px', objectFit: 'contain', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}
                                onError={(e) => e.target.style.display = 'none'}
                                alt=""
                            />
                            {match.homeName}
                        </div>
                        <div style={{
                            fontSize: '3rem',
                            fontWeight: '900',
                            color: homePoints > awayPoints ? '#4ade80' : 'white',
                            textShadow: homePoints > awayPoints ? '0 0 20px rgba(74, 222, 128, 0.4)' : 'none'
                        }}>
                            {homePoints}
                        </div>
                        {homePoints > awayPoints && <span style={{ color: '#4ade80', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ganador</span>}
                    </div>

                    <div style={{ fontSize: '1.5rem', opacity: 0.3, fontWeight: 900, fontStyle: 'italic' }}>VS</div>

                    {/* Away */}
                    <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '0.5rem',
                            color: 'var(--text-dim)'
                        }}>
                            <img
                                src={getTeamShield(match.awayName)}
                                style={{ width: '48px', height: '48px', objectFit: 'contain', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}
                                onError={(e) => e.target.style.display = 'none'}
                                alt=""
                            />
                            {match.awayName}
                        </div>
                        <div style={{
                            fontSize: '3rem',
                            fontWeight: '900',
                            color: awayPoints > homePoints ? '#4ade80' : 'white',
                            textShadow: awayPoints > homePoints ? '0 0 20px rgba(74, 222, 128, 0.4)' : 'none'
                        }}>
                            {awayPoints}
                        </div>
                        {awayPoints > homePoints && <span style={{ color: '#4ade80', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ganador</span>}
                    </div>
                </div>

                {/* Pitch View - Simultaneous */}
                <div style={{ flex: 1, background: 'linear-gradient(to bottom, rgba(15, 23, 42, 0.5), transparent)', padding: '1rem', overflowY: 'auto' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Cargando alineaciones...</div>
                    ) : (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: '1rem',
                            height: '100%',
                            minHeight: '600px',
                            width: '100%',
                            justifyContent: 'center',
                            flexWrap: 'wrap'
                        }}>
                            {/* Home Team */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '500px', minWidth: '300px' }}>
                                <h4 style={{ textAlign: 'center', margin: '0 0 1rem 0', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8rem' }}>Alineación Local</h4>
                                {lineupHome ? <SoccerPitch players={lineupHome} /> : <div className="text-muted text-center">Sin alineación</div>}
                            </div>

                            {/* Away Team */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '500px', minWidth: '300px' }}>
                                <h4 style={{ textAlign: 'center', margin: '0 0 1rem 0', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8rem' }}>Alineación Visitante</h4>
                                {lineupAway ? <SoccerPitch players={lineupAway} /> : <div className="text-muted text-center">Sin alineación</div>}
                            </div>
                        </div>
                    )}
                </div>

            </div >
        </div >
    );
}

export default MatchDetail;
