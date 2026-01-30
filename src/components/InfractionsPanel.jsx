import { useState, useMemo, memo } from 'react';
import { AlertTriangle, Search, X } from 'lucide-react';
import { getTeamShield } from '../utils/assets';
import { motion, AnimatePresence } from 'framer-motion';

const InfractionRow = memo(({ inf }) => (
    <motion.tr
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        layout
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
    >
        <td style={{ padding: '1rem' }}>J{inf.round}</td>
        <td style={{ padding: '1rem', fontWeight: 600 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <img
                    src={getTeamShield(inf.teamName)}
                    alt={inf.teamName}
                    style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                />
                <span>{inf.teamName}</span>
            </div>
        </td>
        <td style={{ padding: '1rem' }}>{inf.player}</td>
        <td style={{ padding: '1rem', color: '#fca5a5' }}>{inf.type}</td>
        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>{inf.cost}€</td>
    </motion.tr>
));

function InfractionsPanel({ infractions }) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredInfractions = useMemo(() => {
        const cleanTerm = searchTerm.trim().toLowerCase();
        if (!cleanTerm) return infractions;
        return infractions.filter(inf =>
            (inf.teamName || "").toLowerCase().includes(cleanTerm) ||
            (inf.player || "").toLowerCase().includes(cleanTerm)
        );
    }, [infractions, searchTerm]);

    if (!infractions || infractions.length === 0) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                <p>No se han detectado infracciones de alineación.</p>
            </div>
        );
    }

    return (
        <div className="infractions-panel">
            <div className="dashboard-header" style={{ border: 'none', padding: 0, marginBottom: '2rem', alignItems: 'flex-start' }}>
                <div className="header-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h2 style={{ fontSize: 'var(--font-xl)', background: 'none', WebkitTextFillColor: 'initial' }}>Historial de Infracciones</h2>
                        <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5' }}>
                            {filteredInfractions.length} Detectadas
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', width: '100%', maxWidth: '800px' }}>
                    <div className="round-picker" style={{ flex: 1, minWidth: '280px', gap: '0.75rem' }}>
                        <Search size={18} color="var(--text-dim)" />
                        <input
                            type="text"
                            placeholder="Buscar por equipo o jugador..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoComplete="off"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-main)',
                                outline: 'none',
                                fontSize: 'var(--font-sm)',
                                width: '100%'
                            }}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    padding: '0.2rem',
                                    cursor: 'pointer',
                                    color: 'var(--text-dim)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '50%',
                                    transition: 'all 0.2s',
                                    backdropFilter: 'none'
                                }}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <div className="round-picker" style={{ gap: '0.8rem', padding: '0.6rem 1rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                        <AlertTriangle size={16} color="#ef4444" />
                        <p style={{ margin: 0, color: '#fca5a5', fontSize: 'var(--font-xs)', fontWeight: 500 }}>
                            Multa adicional de <b style={{ color: 'white' }}>5€</b> por jornada si se alinean sancionados.
                        </p>
                    </div>
                </div>
            </div>

            <div className="responsive-table-container card" style={{ padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', minWidth: '600px' }}>
                    <thead>
                        <tr style={{ background: '#1e293b', textAlign: 'left' }}>
                            <th style={{ padding: '1rem', borderBottom: '1px solid #334155' }}>Jornada</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid #334155' }}>Equipo</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid #334155' }}>Jugador</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid #334155' }}>Motivo</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid #334155', textAlign: 'right' }}>Multa</th>
                        </tr>
                    </thead>
                    <motion.tbody layout>
                        <AnimatePresence initial={false}>
                            {filteredInfractions.map((inf) => (
                                <InfractionRow key={`${inf.round}-${inf.teamName}-${inf.player}`} inf={inf} />
                            ))}
                        </AnimatePresence>
                    </motion.tbody>
                </table>
            </div>
        </div>
    );
}

export default InfractionsPanel;
