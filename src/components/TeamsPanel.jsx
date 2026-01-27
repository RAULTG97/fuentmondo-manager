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

    const renderTeamCard = (teamName, teamObj = null, idx) => (
        <motion.div
            key={teamObj?.id || idx}
            variants={itemVariants}
            className={`team-card ${teamObj ? 'clickable' : ''}`}
            onClick={() => teamObj && onTeamClick(teamObj)}
            whileHover={{
                scale: 1.02,
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
    );

    // If it's a Copa championship, extract participants from cupData
    if (championship?.type === 'copa' && cupData?.rounds) {
        const participants = new Set();
        cupData.rounds.forEach(round => {
            round.matches?.forEach(match => {
                if (match.home?.team?.name) participants.add(match.home.team.name);
                if (match.away?.team?.name) participants.add(match.away.team.name);
            });
        });
        const participantsList = Array.from(participants).sort();

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

    // For league championships, show standings
    const sortedTeams = [...h2hStandings].sort((a, b) => a.name.localeCompare(b.name));

    return (
        <motion.div
            className="teams-grid-container"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <div className="teams-grid">
                {sortedTeams.map((team, idx) => renderTeamCard(team.name, team, idx))}
            </div>
        </motion.div>
    );
};

export default TeamsPanel;
