import { useState, useEffect } from 'react';
import { X, Shirt, Crown } from 'lucide-react';
import { getInternalLineup } from '../services/api';
import SoccerPitch from './SoccerPitch';
import { getTeamShield } from '../utils/assets';

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

    if (!match) return null;

    return (
        <div className="modal-overlay"
            onClick={onClose}
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
            }}>
            <div className="card fade-in"
                onClick={e => e.stopPropagation()}
                style={{
                    width: '95%', maxWidth: '1000px', height: '90vh',
                    display: 'flex', flexDirection: 'column', position: 'relative',
                    padding: '0', overflow: 'hidden'
                }}>

                {/* Header */}
                <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Detalle del Enfrentamiento</h3>
                    <button onClick={onClose} style={{ background: 'transparent', padding: '0.2rem' }}>
                        <X size={24} color="white" />
                    </button>
                </div>

                {/* Scoreboard */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem', gap: '2rem', background: '#1e293b' }}>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: '1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <img src={getTeamShield(match.homeName)} style={{ width: '24px', height: '24px', objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} alt="" />
                            {match.homeName}
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: homePoints > awayPoints ? '#4ade80' : 'white' }}>
                            {homePoints}
                        </div>
                    </div>

                    <div style={{ fontSize: '1.2rem', opacity: 0.3 }}>VS</div>

                    <div style={{ textAlign: 'center', flex: 1 }}>
                        <div style={{ fontSize: '1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <img src={getTeamShield(match.awayName)} style={{ width: '24px', height: '24px', objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} alt="" />
                            {match.awayName}
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: awayPoints > homePoints ? '#4ade80' : 'white' }}>
                            {awayPoints}
                        </div>
                    </div>
                </div>

                {/* Pitch View - Simultaneous */}
                <div style={{ flex: 1, background: '#0f172a', padding: '1rem', overflowY: 'auto' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '4rem' }}>Cargando alineaciones...</div>
                    ) : (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: '1rem',
                            height: '100%',
                            minHeight: '600px',
                            width: '100%',
                            justifyContent: 'center'
                        }}>
                            {/* Home Team */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '500px' }}>
                                <h4 style={{ textAlign: 'center', margin: '0 0 0.5rem 0', color: '#94a3b8' }}>Local</h4>
                                {lineupHome ? <SoccerPitch players={lineupHome} /> : <div className="text-muted text-center">Sin alineación</div>}
                            </div>

                            {/* Away Team */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '500px' }}>
                                <h4 style={{ textAlign: 'center', margin: '0 0 0.5rem 0', color: '#94a3b8' }}>Visitante</h4>
                                {lineupAway ? <SoccerPitch players={lineupAway} /> : <div className="text-muted text-center">Sin alineación</div>}
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

export default MatchDetail;
