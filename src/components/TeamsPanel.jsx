import React from 'react';
import { getTeamShield } from '../utils/assets';
import { useTournament } from '../context/TournamentContext';
import './TeamsPanel.css';

const TeamsPanel = ({ h2hStandings, onTeamClick }) => {
    const { championship, cupData } = useTournament();

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
            <div className="teams-grid-container fade-in">
                <h3 style={{
                    color: '#fbbf24',
                    marginBottom: '1.5rem',
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    textAlign: 'center'
                }}>
                    Participantes Copa Piraña
                </h3>
                <div className="teams-grid">
                    {participantsList.map((teamName, idx) => (
                        <div
                            key={idx}
                            className="team-card"
                        >
                            <div className="team-shield-container">
                                <img
                                    src={getTeamShield(teamName)}
                                    alt={teamName}
                                    className="team-card-shield"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                            </div>
                            <div className="team-card-info">
                                <h3 className="team-card-name">{teamName}</h3>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // For league championships, show standings
    const sortedTeams = [...h2hStandings].sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="teams-grid-container fade-in">
            <div className="teams-grid">
                {sortedTeams.map((team) => (
                    <div
                        key={team.id}
                        className="team-card clickable"
                        onClick={() => onTeamClick(team)}
                    >
                        <div className="team-shield-container">
                            <img
                                src={getTeamShield(team.name)}
                                alt={team.name}
                                className="team-card-shield"
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                        </div>
                        <div className="team-card-info">
                            <h3 className="team-card-name">{team.name}</h3>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TeamsPanel;
