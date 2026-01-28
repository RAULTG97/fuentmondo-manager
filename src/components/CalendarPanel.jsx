import React, { useMemo } from 'react';
import { getTeamShield } from '../utils/assets';
import './CalendarPanel.css';

const CalendarPanel = ({ allRounds, h2hStandings, onTeamClick, onMatchClick }) => {
    // Filter rounds from 20 to 38
    const calendarRounds = useMemo(() =>
        allRounds.filter(r => r.number >= 20 && r.number <= 38).sort((a, b) => a.number - b.number)
        , [allRounds]);

    // Create a matrix: teamId -> { roundNumber -> matchInfo }
    const matrix = useMemo(() => {
        const m = {};
        h2hStandings.forEach(team => {
            m[team.id] = {};
            calendarRounds.forEach(round => {
                if (!round.matches) return;

                const match = round.matches.find(match =>
                    match.homeTeamId === team.id || match.awayTeamId === team.id
                );

                if (match) {
                    const isHome = match.homeTeamId === team.id;
                    const opponentId = isHome ? match.awayTeamId : match.homeTeamId;
                    const opponentName = isHome ? match.awayName : match.homeName;

                    let result = null;
                    if (round.status === 'past' || match.hasScores) {
                        const scoreH = match.homeScore || 0;
                        const scoreA = match.awayScore || 0;

                        if (isHome) {
                            if (scoreH > scoreA) result = 'V';
                            else if (scoreH === scoreA) result = 'E';
                            else result = 'D';
                        } else {
                            if (scoreA > scoreH) result = 'V';
                            else if (scoreA === scoreH) result = 'E';
                            else result = 'D';
                        }
                    }

                    m[team.id][round.number] = {
                        opponentId,
                        opponentName,
                        result,
                        matchId: match.id,
                        status: round.status,
                        fullMatch: match,
                        roundId: round._id
                    };
                }
            });
        });
        return m;
    }, [h2hStandings, calendarRounds]);

    if (!h2hStandings || h2hStandings.length === 0) {
        return (
            <div className="no-data-notice" style={{ padding: '4rem', textAlign: 'center' }}>
                <p>Cargando datos de equipos y jornadas...</p>
                <p style={{ fontSize: '0.8rem', opacity: 0.5, marginTop: '1rem' }}>Si el problema persiste, intenta abrir la pestaña de Clasificación primero.</p>
            </div>
        );
    }

    return (
        <div className="calendar-panel animate-in">
            <div className="calendar-table-wrapper">
                <table className="calendar-table">
                    <thead>
                        <tr>
                            <th className="sticky-col-team">EQUIPO</th>
                            {calendarRounds.map(r => (
                                <th key={r.number} className="round-header">
                                    J{r.number}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {h2hStandings.map(team => (
                            <tr key={team.id}>
                                <td className="sticky-col-team">
                                    <div className="team-cell-content" onClick={() => onTeamClick(team)}>
                                        <img
                                            src={getTeamShield(team.name)}
                                            alt={team.name}
                                            className="team-shield-large"
                                        />
                                    </div>
                                </td>
                                {calendarRounds.map(r => {
                                    const match = matrix[team.id]?.[r.number];
                                    if (!match) return <td key={r.number} className="calendar-cell empty">-</td>;

                                    return (
                                        <td
                                            key={r.number}
                                            className={`calendar-cell ${match.fullMatch ? 'clickable' : ''}`}
                                            onClick={() => match.fullMatch && onMatchClick(match.fullMatch, match.roundId)}
                                        >
                                            <div className="cell-content">
                                                <img
                                                    src={getTeamShield(match.opponentName)}
                                                    alt={match.opponentName}
                                                    className="opp-shield-micro"
                                                    title={`${team.name} vs ${match.opponentName}`}
                                                />
                                                {match.result && (
                                                    <div className={`result-overlay result-${match.result}`}>
                                                        {match.result}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CalendarPanel;
