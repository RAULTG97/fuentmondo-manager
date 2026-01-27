import React from 'react';
import { motion } from 'framer-motion';
import { getTeamShield } from '../utils/assets';
import { useTournament } from '../context/TournamentContext';
import './TeamsPanel.css';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.04
        }
    }
};

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

    const renderTeamCard = React.useCallback((teamName, teamObj = null, idx) => (
        <motion.div
            key={teamObj?.id || `${teamName}-${idx}`}
            variants={itemVariants}
            className={`team-card ${teamObj ? 'clickable' : ''}`}
            onClick={() => teamObj && onTeamClick(teamObj)}
            whileHover={{
                scale: 1.02,
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                borderColor: 'var(--primary)'
            }}
            whileTap={{ scale: 0.98 }}
        >
            <div className="team-shield-container">
                <img
                    src={getTeamShield(teamName)}
                    alt={teamName}
                    className="team-card-shield"
                    loading="lazy"
                    onError={(e) => { e.target.style.opacity = '0'; }}
                />
            </div>
            <div className="team-card-info">
                <h3 className="team-card-name">{teamName}</h3>
            </div>
        </motion.div>
    ), [onTeamClick]);

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
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <motion.h3
                    variants={itemVariants}
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
                    {participantsList.map((name, idx) => renderTeamCard(name, null, idx))}
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            className="teams-grid-container"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <div className="teams-grid">
                {sortedTeamsList.map((team, idx) => renderTeamCard(team.name, team, idx))}
            </div>
        </motion.div>
    );
};

export default TeamsPanel;
