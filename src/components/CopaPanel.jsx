import { getTeamShield, COPA_LOGO } from '../utils/assets';
import { Loader2 } from 'lucide-react';

function CopaPanel({ cupData, loading, championship }) {
    if (loading) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
                <Loader2 className="animate-spin" size={32} color="#3b82f6" style={{ margin: '0 auto 1rem' }} />
                <p>Cargando cuadro de COPA...</p>
            </div>
        );
    }

    if (!cupData || !cupData.rounds) {
        return <p className="text-muted text-center">No hay datos de la Copa disponibles.</p>;
    }

    // Filter rounds with matches and sort them correctly
    const activeRounds = [...cupData.rounds]
        .filter(r => r.matches && r.matches.length > 0)
        .sort((a, b) => a.number - b.number);

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
                    {activeRounds.map((rnd, rIdx) => (
                        <div key={rnd.number} className="bracket-column" style={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-around',
                            gap: '2rem'
                        }}>
                            <div style={{
                                textAlign: 'center',
                                marginBottom: '1.5rem',
                                color: isCopaPirana ? '#fbbf24' : '#fbbf24',
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                fontSize: isCopaPirana ? '1rem' : '0.8rem',
                                letterSpacing: '0.1em',
                                textShadow: isCopaPirana ? '0 0 10px rgba(251, 191, 36, 0.3)' : 'none',
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
                                gap: isCopaPirana ? '2rem' : '1rem'
                            }}>
                                {rnd.matches.map((m, mIdx) => {
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
                                            width: isCopaPirana ? '260px' : '240px',
                                            background: isCopaPirana
                                                ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)'
                                                : 'rgba(30, 41, 59, 0.8)',
                                            border: isCopaPirana
                                                ? '1px solid rgba(251, 191, 36, 0.3)'
                                                : '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: isCopaPirana ? '12px' : '8px',
                                            padding: isCopaPirana ? '0.75rem' : '0.5rem',
                                            fontSize: '0.85rem',
                                            boxShadow: isCopaPirana
                                                ? '0 8px 24px rgba(0,0,0,0.4), 0 0 20px rgba(251, 191, 36, 0.1)'
                                                : '0 4px 6px rgba(0,0,0,0.3)',
                                            position: 'relative',
                                            transition: 'all 0.3s ease',
                                            overflow: 'hidden'
                                        }}
                                            onMouseEnter={(e) => {
                                                if (isCopaPirana) {
                                                    e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                                                    e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.5), 0 0 30px rgba(251, 191, 36, 0.2)';
                                                    e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.5)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (isCopaPirana) {
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
                                                padding: isCopaPirana ? '6px 0' : '4px 0',
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
                                                        fontSize: isCopaPirana ? '0.9rem' : '0.85rem',
                                                        color: isHomeWinner ? '#4ade80' : '#e2e8f0'
                                                    }}>
                                                        {homeTeam?.name || 'TBD'}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '4px', marginLeft: '4px' }}>
                                                    {hScores.map((s, idx) => (
                                                        <span key={idx} style={{ fontSize: '0.7rem', opacity: 0.5 }}>{s}</span>
                                                    ))}
                                                    <span style={{
                                                        fontWeight: 'bold',
                                                        color: (finished && hTotal > aTotal) ? '#4ade80' : 'white',
                                                        minWidth: '24px',
                                                        textAlign: 'right',
                                                        fontSize: isCopaPirana ? '1rem' : '0.85rem'
                                                    }}>
                                                        {hTotal}
                                                    </span>
                                                </div>
                                            </div>

                                            <div style={{
                                                height: '1px',
                                                background: isCopaPirana
                                                    ? 'linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.3), transparent)'
                                                    : 'rgba(255,255,255,0.05)',
                                                margin: '4px 0'
                                            }}></div>

                                            {/* Away Team */}
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: isCopaPirana ? '6px 0' : '4px 0',
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
                                                        fontSize: isCopaPirana ? '0.9rem' : '0.85rem',
                                                        color: isAwayWinner ? '#4ade80' : '#e2e8f0'
                                                    }}>
                                                        {awayTeam?.name || 'TBD'}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '4px', marginLeft: '4px' }}>
                                                    {aScores.map((s, idx) => (
                                                        <span key={idx} style={{ fontSize: '0.7rem', opacity: 0.5 }}>{s}</span>
                                                    ))}
                                                    <span style={{
                                                        fontWeight: 'bold',
                                                        color: (finished && aTotal > hTotal) ? '#4ade80' : 'white',
                                                        minWidth: '24px',
                                                        textAlign: 'right',
                                                        fontSize: isCopaPirana ? '1rem' : '0.85rem'
                                                    }}>
                                                        {aTotal}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
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
                .bracket-column:not(:last-child) .bracket-matchup::after {
                    content: "";
                    position: absolute;
                    top: 50%;
                    right: ${isCopaPirana ? '-4rem' : '-3rem'};
                    width: ${isCopaPirana ? '4rem' : '3rem'};
                    height: 2px;
                    background: ${isCopaPirana
                        ? 'linear-gradient(90deg, rgba(251, 191, 36, 0.4), rgba(251, 191, 36, 0.1))'
                        : 'rgba(255,255,255,0.2)'
                    };
                    z-index: -1;
                    box-shadow: ${isCopaPirana ? '0 0 8px rgba(251, 191, 36, 0.2)' : 'none'};
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
