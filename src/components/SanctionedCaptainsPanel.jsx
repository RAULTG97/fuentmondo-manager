import { useState } from 'react';
import { ShieldAlert, Ban, Timer, History, AlertCircle, Search } from 'lucide-react';
import { getTeamShield } from '../utils/assets';


function SanctionedCaptainsPanel({ activeSanctions, currentRound }) {
    const [filter, setFilter] = useState('current'); // 'current' or 'historical'
    const [searchTerm, setSearchTerm] = useState('');

    if (!activeSanctions || activeSanctions.length === 0) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                <p>No hay registro de sanciones.</p>
            </div>
        );
    }

    const filteredTotal = activeSanctions.filter(s =>
        s.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.player.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const currentSanctions = filteredTotal.filter(s => s.noCaptUntil >= currentRound);
    const historicalSanctions = filteredTotal.filter(s => s.noCaptUntil < currentRound);

    const displayedSanctions = filter === 'current' ? currentSanctions : historicalSanctions;


    return (
        <div className="sanctioned-captains-panel">
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                <button
                    onClick={() => setFilter('current')}
                    style={{
                        background: 'transparent', border: 'none', color: filter === 'current' ? '#fbbf24' : '#64748b',
                        fontWeight: 600, padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                        borderBottom: filter === 'current' ? '2px solid #fbbf24' : 'none'
                    }}
                >
                    <AlertCircle size={18} />
                    Sanciones en Curso ({currentSanctions.length})
                </button>
                <button
                    onClick={() => setFilter('historical')}
                    style={{
                        background: 'transparent', border: 'none', color: filter === 'historical' ? '#94a3b8' : '#64748b',
                        fontWeight: 600, padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                        borderBottom: filter === 'historical' ? '2px solid #94a3b8' : 'none'
                    }}
                >
                    <History size={18} />
                    Sanciones Históricas ({historicalSanctions.length})
                </button>
            </div>

            <div className="flex-between" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '300px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                        <input
                            type="text"
                            placeholder="Buscar por equipo o jugador..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="sidebar-select"
                            style={{ width: '100%', paddingLeft: '2.8rem' }}
                        />
                    </div>
                </div>

                <div style={{ flex: 1, padding: '1rem', background: filter === 'current' ? 'rgba(251, 191, 36, 0.1)' : 'rgba(148, 163, 184, 0.1)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <Timer color={filter === 'current' ? "#fbbf24" : "#94a3b8"} size={24} />
                    <p style={{ margin: 0, fontSize: '0.85rem', color: filter === 'current' ? '#fcd34d' : '#94a3b8' }}>
                        {filter === 'current'
                            ? 'Restricciones activas/futuras por 3ª capitanía.'
                            : 'Historial de sanciones ya cumplidas.'}
                    </p>
                </div>
            </div>


            {displayedSanctions.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', border: '2px dashed rgba(255,255,255,0.05)', borderRadius: '12px', color: '#64748b' }}>
                    No hay sanciones en esta categoría.
                </div>
            ) : (
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                    {displayedSanctions.map((s, idx) => {
                        const startRound = s.outTeamUntil - 2;
                        // Reference round for calculations:
                        // If currentRound is before startRound, we count from startRound
                        // Otherwise we count from currentRound
                        const referenceRound = Math.max(currentRound, startRound);

                        const outTeamRoundsLeft = Math.max(0, s.outTeamUntil - referenceRound + 1);
                        const totalNoCaptLeft = Math.max(0, s.noCaptUntil - referenceRound + 1);

                        return (
                            <div key={idx} className="card" style={{ padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)', opacity: filter === 'historical' ? 0.7 : 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <img
                                            src={getTeamShield(s.teamName)}
                                            alt={s.teamName}
                                            style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                                            onError={(e) => e.target.style.display = 'none'}
                                        />
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{s.player}</h3>
                                            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{s.teamName}</span>
                                        </div>
                                    </div>
                                    <ShieldAlert size={20} color={filter === 'current' ? "#fbbf24" : "#94a3b8"} />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: outTeamRoundsLeft > 0 ? 1 : 0.5 }}>
                                        <Ban size={16} color={outTeamRoundsLeft > 0 ? '#ef4444' : '#94a3b8'} />
                                        <span style={{ fontSize: '0.9rem' }}>
                                            Fuera del equipo: <b>{outTeamRoundsLeft > 0 ? `${outTeamRoundsLeft} jornadas` : 'Completado'}</b>
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: totalNoCaptLeft > 0 ? 1 : 0.5 }}>
                                        <Timer size={16} color={totalNoCaptLeft > 0 ? '#fbbf24' : '#94a3b8'} />
                                        <span style={{ fontSize: '0.9rem' }}>
                                            Sin capitanía: <b>{totalNoCaptLeft > 0 ? `${totalNoCaptLeft} jornadas` : 'Completado'}</b>
                                        </span>
                                    </div>
                                </div>

                                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.75rem', color: '#64748b' }}>
                                    Sanción desde J{s.outTeamUntil - 2} hasta J{s.noCaptUntil}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default SanctionedCaptainsPanel;
