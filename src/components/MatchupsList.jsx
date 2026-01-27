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

function MatchupsList({ matches, onMatchClick, isLiveRound }) {
    if (!matches || matches.length === 0) {
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

                const homeScore = m.homeScore !== undefined ? m.homeScore : '-';
                const awayScore = m.awayScore !== undefined ? m.awayScore : '-';

                // Determine winner for highlighting
                const homeWon = isEnriched && m.homeScore > m.awayScore;
                const awayWon = isEnriched && m.awayScore > m.homeScore;

                // Match Status (Simplified logic)
                const isFinished = isEnriched; // Assuming enriched means calculate/finished roughly

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
                                        {(isLiveRound && !isEnriched) ? '-' : homeScore}
                                    </span>
                                    <span className="score-divider">:</span>
                                    <span className={awayWon ? 'winner-glow' : ''}>
                                        {(isLiveRound && !isEnriched) ? '-' : awayScore}
                                    </span>
                                </div>
                                <div className="match-status">
                                    {isFinished ? 'Final' : (showLiveBadge ? 'En Juego' : 'Pendiente')}
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
