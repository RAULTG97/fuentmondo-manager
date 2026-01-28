import { motion } from 'framer-motion';
import { getTeamShield } from '../utils/assets';

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

function MatchupsList({ matches, onMatchClick, isLiveRound, roundStatus }) {
    if (!matches || matches.length === 0) {
        // Special message for historical rounds
        if (roundStatus === 'historical') {
            return (
                <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                    <div style={{
                        background: 'rgba(251, 191, 36, 0.1)',
                        border: '1px solid rgba(251, 191, 36, 0.3)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '2rem',
                        maxWidth: '500px',
                        margin: '0 auto'
                    }}>
                        <h3 style={{ color: '#fbbf24', marginBottom: '0.5rem', fontSize: '1.2rem' }}>
                            📋 Primera Vuelta
                        </h3>
                        <p style={{ color: 'var(--text-dim)', fontSize: '0.95rem' }}>
                            PRIMERA VUELTA PENDIENTE DE CARGAR
                        </p>
                        <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginTop: '0.5rem', opacity: 0.7 }}>
                            Los datos de las jornadas 1-19 se añadirán próximamente
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>
                <p>No hay enfrentamientos disponibles.</p>
            </div>
        );
    }

    return (
        <motion.div
            className="matchups-grid"
            variants={container}
            initial="hidden"
            animate="show"
        >
            {matches.map((m, idx) => {
                const homeName = m.homeName || "Local";
                const awayName = m.awayName || "Visitante";
                const isEnriched = m.enriched;
                const showLiveBadge = isLiveRound && isEnriched;

                // Determine scores based on round status
                let homeScore, awayScore;
                if (roundStatus === 'future') {
                    homeScore = 0;
                    awayScore = 0;
                } else if (roundStatus === 'past') {
                    homeScore = m.homeScore !== undefined ? m.homeScore : 0;
                    awayScore = m.awayScore !== undefined ? m.awayScore : 0;
                } else if (roundStatus === 'current') {
                    homeScore = m.homeScore !== undefined ? m.homeScore : '-';
                    awayScore = m.awayScore !== undefined ? m.awayScore : '-';
                } else {
                    homeScore = m.homeScore !== undefined ? m.homeScore : '-';
                    awayScore = m.awayScore !== undefined ? m.awayScore : '-';
                }

                // Determine winner for highlighting (only for past/current with scores)
                const homeWon = (roundStatus === 'past' || (roundStatus === 'current' && isEnriched)) &&
                    m.homeScore > m.awayScore;
                const awayWon = (roundStatus === 'past' || (roundStatus === 'current' && isEnriched)) &&
                    m.awayScore > m.homeScore;

                // Match Status
                let matchStatus = 'Pendiente';
                if (roundStatus === 'past') {
                    matchStatus = 'Final';
                } else if (roundStatus === 'current') {
                    matchStatus = showLiveBadge ? 'En Juego' : (isEnriched ? 'Final' : 'Pendiente');
                } else if (roundStatus === 'future') {
                    matchStatus = 'Próximo';
                }

                return (
                    <motion.div
                        key={m._id || idx}
                        className={`match-card ${showLiveBadge ? 'live-match' : ''}`}
                        variants={item}
                        onClick={() => onMatchClick && onMatchClick(m)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {showLiveBadge && (
                            <div className="live-badge">
                                <span className="live-pulse"></span>
                                LIVE
                            </div>
                        )}

                        <div className="match-content">
                            {/* Home Team */}
                            <div className="team-block">
                                <div className="team-shield-container">
                                    <img
                                        src={getTeamShield(homeName)}
                                        alt={homeName}
                                        className="team-shield"
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                        loading="lazy"
                                    />
                                </div>
                                <span className={`team-name ${homeWon ? 'winner-glow' : ''}`}>
                                    {homeName}
                                </span>
                            </div>

                            {/* Score / VS */}
                            <div className="score-block">
                                <div className={`score-display ${showLiveBadge ? 'score-live' : ''}`}>
                                    <span className={homeWon ? 'winner-glow' : ''}>
                                        {homeScore}
                                    </span>
                                    <span className="score-divider">:</span>
                                    <span className={awayWon ? 'winner-glow' : ''}>
                                        {awayScore}
                                    </span>
                                </div>
                                <div className="match-status">
                                    {matchStatus}
                                </div>
                            </div>

                            {/* Away Team */}
                            <div className="team-block">
                                <div className="team-shield-container">
                                    <img
                                        src={getTeamShield(awayName)}
                                        alt={awayName}
                                        className="team-shield"
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                        loading="lazy"
                                    />
                                </div>
                                <span className={`team-name ${awayWon ? 'winner-glow' : ''}`}>
                                    {awayName}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </motion.div>
    );
}

export default MatchupsList;
