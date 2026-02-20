import { getTeamShield, COPA_LOGO } from '../utils/assets';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import MatchDetail from './MatchDetail';

function CopaPanel({ cupData, loading, championship, onMatchClick }) {
    if (loading) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
                <Loader2 className="animate-spin" size={32} color="#3b82f6" style={{ margin: '0 auto 1rem' }} />
                <p>Cargando cuadro de COPA...</p>
            </div>
        );
    }

    // Safe extraction of rounds, handling if cupData is the array itself or an object
    const rawRounds = Array.isArray(cupData) ? cupData : (cupData?.rounds || []);

    if (!rawRounds || rawRounds.length === 0) {
        return <p className="text-muted text-center">No hay datos de la Copa disponibles.</p>;
    }

    // Filter rounds with matches and sort them correctly
    const activeRounds = [...rawRounds]
        .filter(r => r.matches && r.matches.length > 0)
        .sort((a, b) => a.number - b.number);

    // Group activeRounds by their base round number (e.g., 1.1 and 1.2 -> 1)
    const groupedRounds = [];
    const roundsByBase = {};

    activeRounds.forEach(r => {
        const baseNum = Math.floor(r.number || 0);
        if (!roundsByBase[baseNum]) {
            roundsByBase[baseNum] = {
                ...r,
                number: baseNum,
                matches: [],
                roundIds: [],
                originalRounds: [] // Keep track of original round objects
            };
            groupedRounds.push(roundsByBase[baseNum]);
        }
        roundsByBase[baseNum].matches.push(...(r.matches || []));
        roundsByBase[baseNum].originalRounds.push(r); // Store original round
        const rId = r.roundId || r.id || r._id;
        if (rId) roundsByBase[baseNum].roundIds.push(rId);
    });


    const getRoundTitle = (num) => {
        switch (num) {
            case 1: return '1/32 Final';
            case 2: return '1/16 Final';
            case 3: return 'Octavos';
            case 4: return 'Cuartos';
            case 5: return 'Semifinales';
            case 6: return 'Final';
            default: return `Ronda ${num}`;
        }
    };

    // Extract all unique participants from all rounds
    const participants = new Set();
    activeRounds.forEach(round => {
        round.matches?.forEach(match => {
            if (match.home?.team?.name) participants.add(match.home.team.name);
            if (match.away?.team?.name) participants.add(match.away.team.name);
        });
    });
    const participantsList = Array.from(participants).sort();

    // Check if this is Copa Piraña championship
    const isCopaPirana = championship?.name?.toUpperCase().includes('COPA PIRAÑA');


    const handleMatchClick = (match, round) => {
        // Only allow clicking if both teams exist (skip Byes)
        if (!match.home?.team || !match.away?.team) return;

        const normalizedMatch = {
            ...match,
            homeName: match.home?.team?.name,
            awayName: match.away?.team?.name,
            homeScore: match.home?.scores?.reduce((a, b) => a + b, 0) || 0,
            awayScore: match.away?.scores?.reduce((a, b) => a + b, 0) || 0,
            roundName: getRoundTitle(round.number)
        };

        // Use legIds if available (from groupedMatches), otherwise fallback to round IDs
        const roundIds = Array.isArray(match.legIds) ? match.legIds :
            (Array.isArray(round.roundIds) ? round.roundIds :
                (round.roundId ? [round.roundId] :
                    (round.id ? [round.id] :
                        (round._id ? [round._id] : []))));

        // Delegate to parent Dashboard
        if (onMatchClick) {
            onMatchClick(normalizedMatch, roundIds);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Participants Grid - Only show when NOT Copa Piraña */}
            {!isCopaPirana && (
                <div className="copa-participants-section">
                    <h3 style={{
                        color: '#fbbf24',
                        marginBottom: '1.5rem',
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        textAlign: 'center'
                    }}>
                        Participantes Copa Piraña
                    </h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: '1rem',
                        padding: '1rem',
                        background: '#1e293b',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                        {participantsList.map((teamName, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.75rem',
                                background: 'rgba(15, 23, 42, 0.6)',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                transition: 'all 0.2s ease'
                            }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(15, 23, 42, 0.6)';
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                                }}
                            >
                                <img
                                    src={getTeamShield(teamName)}
                                    alt={teamName}
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        objectFit: 'contain'
                                    }}
                                />
                                <span style={{
                                    fontSize: '0.9rem',
                                    fontWeight: '500',
                                    color: '#e2e8f0'
                                }}>
                                    {teamName}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Enhanced Bracket Visualization */}
            <div className="copa-bracket-container" style={{
                overflowX: 'auto',
                padding: '2rem',
                background: isCopaPirana
                    ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
                    : '#0f172a',
                borderRadius: '16px',
                minHeight: '600px',
                boxShadow: isCopaPirana
                    ? '0 20px 60px rgba(251, 191, 36, 0.15), inset 0 0 80px rgba(251, 191, 36, 0.03)'
                    : '0 4px 6px rgba(0,0,0,0.1)',
                border: isCopaPirana
                    ? '1px solid rgba(251, 191, 36, 0.2)'
                    : '1px solid rgba(255, 255, 255, 0.05)',
                position: 'relative'
            }}>
                {isCopaPirana && (
                    <>
                        {/* Trophy Logo for Copa Piraña */}
                        <div style={{
                            textAlign: 'center',
                            marginBottom: '1rem',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}>
                            <img
                                src={COPA_LOGO}
                                alt="Copa Piraña Trophy"
                                style={{
                                    width: '180px',
                                    height: 'auto',
                                    filter: 'drop-shadow(0 0 20px rgba(251, 191, 36, 0.4))',
                                    animation: 'pulse-glow 3s ease-in-out infinite'
                                }}
                            />
                        </div>

                        {/* Title for Copa Piraña */}
                        <div style={{
                            textAlign: 'center',
                            marginBottom: '2rem',
                            position: 'relative'
                        }}>
                            <h2 style={{
                                fontSize: '2.5rem',
                                fontWeight: 'bold',
                                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #fbbf24 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                textTransform: 'uppercase',
                                letterSpacing: '0.15em',
                                marginBottom: '0.5rem',
                                textShadow: '0 0 30px rgba(251, 191, 36, 0.3)',
                                animation: 'pulse-glow 3s ease-in-out infinite'
                            }}>
                                Cuadro de Eliminatorias
                            </h2>
                            <div style={{
                                height: '3px',
                                width: '200px',
                                background: 'linear-gradient(90deg, transparent, #fbbf24, transparent)',
                                margin: '0 auto',
                                borderRadius: '2px',
                                boxShadow: '0 0 10px rgba(251, 191, 36, 0.5)'
                            }}></div>
                        </div>

                        {/* Decorative elements */}
                        <div style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            width: '100px',
                            height: '100px',
                            background: 'radial-gradient(circle, rgba(251, 191, 36, 0.1) 0%, transparent 70%)',
                            borderRadius: '50%',
                            pointerEvents: 'none'
                        }}></div>
                        <div style={{
                            position: 'absolute',
                            bottom: '10px',
                            right: '10px',
                            width: '150px',
                            height: '150px',
                            background: 'radial-gradient(circle, rgba(251, 191, 36, 0.1) 0%, transparent 70%)',
                            borderRadius: '50%',
                            pointerEvents: 'none'
                        }}></div>
                    </>
                )}

                <div className="bracket-wrapper" style={{
                    display: 'flex',
                    gap: isCopaPirana ? '4rem' : '3rem',
                    minWidth: 'max-content',
                    padding: '1rem',
                    justifyContent: 'center'
                }}>
                    {groupedRounds.map((rnd, rIdx) => (
                        <div key={rnd.number} className="bracket-column" style={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-around',
                            gap: '2rem'
                        }}>
                            <div style={{
                                textAlign: 'center',
                                marginBottom: '1.5rem',
                                color: '#fbbf24',
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                fontSize: isCopaPirana ? '1.1rem' : '0.8rem',
                                letterSpacing: '0.1em',
                                textShadow: '0 0 10px rgba(251, 191, 36, 0.3)',
                                padding: '0.5rem 1rem',
                                background: isCopaPirana
                                    ? 'rgba(251, 191, 36, 0.1)'
                                    : 'transparent',
                                borderRadius: '8px',
                                border: isCopaPirana
                                    ? '1px solid rgba(251, 191, 36, 0.2)'
                                    : 'none'
                            }}>
                                {getRoundTitle(rnd.number)}
                            </div>

                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-around',
                                flex: 1,
                                gap: isCopaPirana ? '2.5rem' : '1.5rem'
                            }}>
                                {(() => {
                                    let finalMatches = [];

                                    // Copa Piraña: Matches already contain both legs scores in arrays
                                    if (isCopaPirana) {
                                        finalMatches = (rnd.matches || []).map(m => {
                                            if (!m.home?.team || !m.away?.team) return null;

                                            const hScores = m.home.scores || [];
                                            const aScores = m.away.scores || [];

                                            // Ensure we have legIds from the round object
                                            // The round object has a 'rounds' array with [idaId, vueltaId]
                                            const legIds = rnd.rounds || [];

                                            return {
                                                ...m,
                                                legIds, // Pass the roundIds for both legs
                                                home: { ...m.home, scores: hScores },
                                                away: { ...m.away, scores: aScores }
                                            };
                                        }).filter(Boolean);
                                    } else {
                                        // League Logic (grouping by pairing)
                                        const groupedMatches = [];
                                        const seenPairs = new Set();

                                        (rnd.matches || []).forEach(m => {
                                            const hName = m.home?.team?.name;
                                            const aName = m.away?.team?.name;
                                            if (!hName || !aName) {
                                                groupedMatches.push(m);
                                                return;
                                            }

                                            const pairKey = [hName, aName].sort().join('|');
                                            if (seenPairs.has(pairKey)) return;
                                            seenPairs.add(pairKey);

                                            // Find other matches in this group that match this pairing
                                            const legs = (rnd.matches || []).filter(lm => {
                                                const lh = lm.home?.team?.name;
                                                const la = lm.away?.team?.name;
                                                return lh && la && [lh, la].sort().join('|') === pairKey;
                                            });

                                            const hScores = [];
                                            const aScores = [];
                                            const legIds = [];

                                            legs.forEach(leg => {
                                                // Logic for League/other tournaments...
                                                const lHScore = (leg.home?.scores?.[0] !== undefined) ? leg.home.scores[0] : (leg.homeScore || 0);
                                                const lAScore = (leg.away?.scores?.[0] !== undefined) ? leg.away.scores[0] : (leg.awayScore || 0);
                                                hScores.push(lHScore);
                                                aScores.push(lAScore);

                                                if (leg.roundId) legIds.push(leg.roundId);
                                                else if (leg._id) legIds.push(leg._id);
                                            });

                                            groupedMatches.push({
                                                ...m,
                                                legIds: legIds.length > 0 ? legIds : rnd.roundIds,
                                                home: { ...m.home, scores: hScores },
                                                away: { ...m.away, scores: aScores }
                                            });
                                        });

                                        finalMatches = groupedMatches;
                                    }

                                    return finalMatches.map((m, mIdx) => {
                                        const homeTeam = m.home?.team;
                                        const awayTeam = m.away?.team;
                                        const hScores = m.home?.scores || [];
                                        const aScores = m.away?.scores || [];

                                        const hTotal = hScores.reduce((a, b) => a + b, 0);
                                        const aTotal = aScores.reduce((a, b) => a + b, 0);
                                        const finished = rnd.finished || (hScores.length >= 2 && aScores.length >= 2);

                                        const isHomeWinner = finished && hTotal > aTotal;
                                        const isAwayWinner = finished && aTotal > hTotal;

                                        return (
                                            <div key={mIdx} className="bracket-matchup" style={{
                                                width: isCopaPirana ? '280px' : '240px',
                                                background: isCopaPirana
                                                    ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)'
                                                    : 'rgba(30, 41, 59, 0.8)',
                                                border: isCopaPirana
                                                    ? '1px solid rgba(251, 191, 36, 0.3)'
                                                    : '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: isCopaPirana ? '12px' : '8px',
                                                padding: isCopaPirana ? '1rem' : '0.5rem',
                                                fontSize: '0.85rem',
                                                boxShadow: isCopaPirana
                                                    ? '0 8px 24px rgba(0,0,0,0.4), 0 0 20px rgba(251, 191, 36, 0.1)'
                                                    : '0 4px 6px rgba(0,0,0,0.3)',
                                                position: 'relative',
                                                transition: 'all 0.3s ease',
                                                overflow: 'hidden',
                                                cursor: (m.home?.team && m.away?.team) ? 'pointer' : 'default',
                                                opacity: (m.home?.team && m.away?.team) ? 1 : 0.6,
                                                filter: (m.home?.team && m.away?.team) ? 'none' : 'grayscale(0.5)'
                                            }}
                                                onClick={() => handleMatchClick(m, rnd)}
                                                onMouseEnter={(e) => {
                                                    if (isCopaPirana && m.home?.team && m.away?.team) {
                                                        e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                                                        e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.5), 0 0 30px rgba(251, 191, 36, 0.2)';
                                                        e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.5)';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (isCopaPirana && m.home?.team && m.away?.team) {
                                                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4), 0 0 20px rgba(251, 191, 36, 0.1)';
                                                        e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.3)';
                                                    }
                                                }}
                                            >
                                                {/* Shimmer effect for Copa Piraña */}
                                                {isCopaPirana && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: '-100%',
                                                        width: '100%',
                                                        height: '100%',
                                                        background: 'linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.1), transparent)',
                                                        animation: 'shimmer 3s infinite',
                                                        pointerEvents: 'none'
                                                    }}></div>
                                                )}

                                                {/* Home Team */}
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: isCopaPirana ? '8px 0' : '4px 0',
                                                    opacity: (finished && aTotal > hTotal) ? 0.5 : 1,
                                                    background: isHomeWinner && isCopaPirana
                                                        ? 'linear-gradient(90deg, rgba(74, 222, 128, 0.15), transparent)'
                                                        : 'transparent',
                                                    borderRadius: '6px',
                                                    transition: 'all 0.3s ease'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, overflow: 'hidden' }}>
                                                        <img
                                                            src={getTeamShield(homeTeam?.name)}
                                                            style={{
                                                                width: isCopaPirana ? '24px' : '18px',
                                                                height: isCopaPirana ? '24px' : '18px',
                                                                objectFit: 'contain',
                                                                filter: isHomeWinner ? 'drop-shadow(0 0 4px rgba(74, 222, 128, 0.5))' : 'none'
                                                            }}
                                                            onError={(e) => e.target.style.display = 'none'}
                                                            alt=""
                                                        />
                                                        <span style={{
                                                            fontWeight: (finished && hTotal > aTotal) ? 700 : 400,
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            fontSize: isCopaPirana ? '0.95rem' : '0.85rem',
                                                            color: isHomeWinner ? '#4ade80' : '#e2e8f0'
                                                        }}>
                                                            {homeTeam?.name || (awayTeam ? 'LIBRE' : 'TBD')}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px', marginLeft: '4px', alignItems: 'center' }}>
                                                        {hScores.map((s, idx) => (
                                                            <div key={idx} style={{
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                alignItems: 'center',
                                                                minWidth: '20px'
                                                            }}>
                                                                <span style={{ fontSize: '0.65rem', opacity: 0.5, fontWeight: 'bold' }}>{idx === 0 ? 'I' : 'V'}</span>
                                                                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{s}</span>
                                                            </div>
                                                        ))}
                                                        <div style={{
                                                            marginLeft: '4px',
                                                            padding: '2px 8px',
                                                            background: isHomeWinner ? 'rgba(74, 222, 128, 0.2)' : 'rgba(255,255,255,0.05)',
                                                            borderRadius: '4px',
                                                            border: isHomeWinner ? '1px solid #4ade80' : '1px solid transparent'
                                                        }}>
                                                            <span style={{
                                                                fontWeight: '900',
                                                                color: isHomeWinner ? '#4ade80' : 'white',
                                                                fontSize: isCopaPirana ? '1.2rem' : '1rem'
                                                            }}>
                                                                {hTotal}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div style={{
                                                    height: '1px',
                                                    background: isCopaPirana
                                                        ? 'linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.3), transparent)'
                                                        : 'rgba(255,255,255,0.05)',
                                                    margin: '6px 0'
                                                }}></div>

                                                {/* Away Team */}
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: isCopaPirana ? '8px 0' : '4px 0',
                                                    opacity: (finished && hTotal > aTotal) ? 0.5 : 1,
                                                    background: isAwayWinner && isCopaPirana
                                                        ? 'linear-gradient(90deg, rgba(74, 222, 128, 0.15), transparent)'
                                                        : 'transparent',
                                                    borderRadius: '6px',
                                                    transition: 'all 0.3s ease'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, overflow: 'hidden' }}>
                                                        <img
                                                            src={getTeamShield(awayTeam?.name)}
                                                            style={{
                                                                width: isCopaPirana ? '24px' : '18px',
                                                                height: isCopaPirana ? '24px' : '18px',
                                                                objectFit: 'contain',
                                                                filter: isAwayWinner ? 'drop-shadow(0 0 4px rgba(74, 222, 128, 0.5))' : 'none'
                                                            }}
                                                            onError={(e) => e.target.style.display = 'none'}
                                                            alt=""
                                                        />
                                                        <span style={{
                                                            fontWeight: (finished && aTotal > hTotal) ? 700 : 400,
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            fontSize: isCopaPirana ? '0.95rem' : '0.85rem',
                                                            color: isAwayWinner ? '#4ade80' : '#e2e8f0'
                                                        }}>
                                                            {awayTeam?.name || (homeTeam ? 'LIBRE' : 'TBD')}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px', marginLeft: '4px', alignItems: 'center' }}>
                                                        {aScores.map((s, idx) => (
                                                            <div key={idx} style={{
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                alignItems: 'center',
                                                                minWidth: '20px'
                                                            }}>
                                                                <span style={{ fontSize: '0.65rem', opacity: 0.5, fontWeight: 'bold' }}>{idx === 0 ? 'I' : 'V'}</span>
                                                                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{s}</span>
                                                            </div>
                                                        ))}
                                                        <div style={{
                                                            marginLeft: '4px',
                                                            padding: '2px 8px',
                                                            background: isAwayWinner ? 'rgba(74, 222, 128, 0.2)' : 'rgba(255,255,255,0.05)',
                                                            borderRadius: '4px',
                                                            border: isAwayWinner ? '1px solid #4ade80' : '1px solid transparent'
                                                        }}>
                                                            <span style={{
                                                                fontWeight: '900',
                                                                color: isAwayWinner ? '#4ade80' : 'white',
                                                                fontSize: isCopaPirana ? '1.2rem' : '1rem'
                                                            }}>
                                                                {aTotal}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    ))}
                </div>

                <style>{`
                .copa-bracket-container::-webkit-scrollbar {
                    height: 10px;
                }
                .copa-bracket-container::-webkit-scrollbar-track {
                    background: rgba(15, 23, 42, 0.5);
                    border-radius: 5px;
                }
                .copa-bracket-container::-webkit-scrollbar-thumb {
                    background: linear-gradient(90deg, rgba(251, 191, 36, 0.5), rgba(245, 158, 11, 0.7));
                    border-radius: 5px;
                    border: 2px solid rgba(15, 23, 42, 0.5);
                }
                .copa-bracket-container::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(90deg, rgba(251, 191, 36, 0.7), rgba(245, 158, 11, 0.9));
                }
                
                @keyframes pulse-glow {
                    0%, 100% {
                        filter: drop-shadow(0 0 20px rgba(251, 191, 36, 0.3));
                    }
                    50% {
                        filter: drop-shadow(0 0 30px rgba(251, 191, 36, 0.5));
                    }
                }
                
                @keyframes shimmer {
                    0% {
                        left: -100%;
                    }
                    100% {
                        left: 100%;
                    }
                }
            `}</style>
            </div>
        </div>
    );
}

export default CopaPanel;
