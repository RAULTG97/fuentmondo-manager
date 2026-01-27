import { Shield } from 'lucide-react';
import { getTeamShield } from '../utils/assets';

function MatchupsList({ matches, onMatchClick, isLiveRound }) {
    if (!matches || matches.length === 0) {
        return <p className="text-muted">No hay enfrentamientos disponibles.</p>;
    }

    return (
        <div className="matchups-grid">
            {matches.map((m, idx) => {
                // Match structure from Internal API:
                // p: [idTeamA, idTeamB] (IDs) -- difficult if we don't have names map
                // but 'data' usually contains names? Or we need to map IDs.
                // Wait, fuentmondo.py maps IDs.
                // Let's see what's in the match object in Dashboard.

                // If we don't have names in match object, we rely on the parent component 
                // passing a map or the match object having them.
                // Inspecting fuentmondo.py: match['p'] are IDs.
                // But dashboard gets ranking list which has ID->Name.
                // So Dashboard should process matches before passing here, 
                // OR pass the ranking map here.

                const homeName = m.homeName || "Local";
                const awayName = m.awayName || "Visitante";
                const isEnriched = m.enriched;
                const showLiveBadge = isLiveRound && isEnriched;
                const homeScore = m.homeScore !== undefined ? m.homeScore : '-';
                const awayScore = m.awayScore !== undefined ? m.awayScore : '-';

                return (
                    <div
                        key={m._id || idx}
                        className="card"
                        onClick={() => onMatchClick && onMatchClick(m)}
                        style={{
                            padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            position: 'relative',
                            border: showLiveBadge ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.05)',
                            boxShadow: showLiveBadge ? '0 0 15px rgba(59, 130, 246, 0.2)' : 'none'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                        onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = showLiveBadge ? '#3b82f6' : 'rgba(255,255,255,0.05)'; }}
                    >
                        {showLiveBadge && (
                            <div style={{
                                position: 'absolute', top: 0, right: 0,
                                background: '#ef4444', color: 'white', fontSize: '0.65rem',
                                padding: '2px 8px', borderBottomLeftRadius: '8px', fontWeight: 'bold',
                                textTransform: 'uppercase'
                            }}>
                                Live
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', maxWidth: '70%' }}>
                                <img
                                    src={getTeamShield(homeName)}
                                    alt=""
                                    style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                                <span style={{ fontWeight: 600, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{homeName}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: isEnriched ? '#fbbf24' : '#64748b' }}>
                                    {(isLiveRound && !isEnriched) ? '...' : homeScore}
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                            <span style={{ fontSize: '0.7rem', opacity: 0.3, fontWeight: 'bold' }}>VS</span>
                            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', maxWidth: '70%' }}>
                                <img
                                    src={getTeamShield(awayName)}
                                    alt=""
                                    style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                                <span style={{ fontWeight: 600, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{awayName}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: isEnriched ? '#fbbf24' : '#64748b' }}>
                                    {(isLiveRound && !isEnriched) ? '...' : awayScore}
                                </span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default MatchupsList;
