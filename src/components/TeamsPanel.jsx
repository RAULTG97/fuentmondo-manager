import React from 'react';
import { motion } from 'framer-motion';
import { getTeamShield } from '../utils/assets';
import { useTournament } from '../context/TournamentContext';
import './TeamsPanel.css';

const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: 'spring', damping: 20, stiffness: 100 }
    }
};

const TeamsPanel = ({ h2hStandings, onTeamClick }) => {
    const { championship, cupData } = useTournament();


    const participantsList = React.useMemo(() => {
        if (championship?.type === 'copa' && cupData?.rounds) {
            const participants = new Set();
            cupData.rounds.forEach(round => {
                round.matches?.forEach(match => {
                    if (match.home?.team?.name) participants.add(match.home.team.name);
                    if (match.away?.team?.name) participants.add(match.away.team.name);
                });
            });
            return Array.from(participants).sort();
        }
        return [];
    }, [championship?.type, cupData?.rounds]);

    const sortedTeamsList = React.useMemo(() => {
        if (championship?.type !== 'copa' && h2hStandings) {
            return [...h2hStandings].sort((a, b) => a.name.localeCompare(b.name));
        }
        return [];
    }, [championship?.type, h2hStandings]);

    if (championship?.type === 'copa') {
        return (
            <motion.div
                className="teams-grid-container"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <motion.h3
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        color: 'var(--accent)',
                        marginBottom: '2rem',
                        fontSize: 'var(--font-xl)',
                        fontWeight: '900',
                        textAlign: 'center',
                        letterSpacing: '-0.02em'
                    }}
                >
                    Participantes Copa Piraña
                </motion.h3>
                <div className="teams-grid">
                    {participantsList.map((name, idx) => (
                        <motion.div
                            key={idx}
                            variants={itemVariants}
                            initial="hidden"
                            animate="visible"
                            className="team-card"
                            whileHover={{
                                scale: 1.02,
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                borderColor: 'var(--primary)'
                            }}
                        >
                            <div className="team-shield-container">
                                <img
                                    src={getTeamShield(name)}
                                    alt={name}
                                    className="team-card-shield"
                                    loading="lazy"
                                />
                            </div>
                            <div className="team-card-info">
                                <h3 className="team-card-name">{name}</h3>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            className="teams-grid-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            key={sortedTeamsList.length}
        >
            <div className="teams-grid">
                {sortedTeamsList.map((team, idx) => (
                    <motion.div
                        key={team.id || idx}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        className={`team-card ${team ? 'clickable' : ''}`}
                        onClick={() => team && onTeamClick(team)}
                        whileHover={{
                            scale: 1.02,
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            borderColor: 'var(--primary)'
                        }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div className="team-shield-container">
                            <img
                                src={getTeamShield(team.name)}
                                alt={team.name}
                                className="team-card-shield"
                                loading="lazy"
                                onError={(e) => { e.target.style.opacity = '0'; }}
                            />
                        </div>
                        <div className="team-card-info">
                            <h3 className="team-card-name">{team.name}</h3>
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
};

export default TeamsPanel;
