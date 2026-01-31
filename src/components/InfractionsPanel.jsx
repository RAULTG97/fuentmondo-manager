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

import { CopaSanctionsService } from '../services/copaSanctionsService';
import { Loader2, Calculator } from 'lucide-react';

function InfractionsPanel({ infractions, isCopa, championshipId, rounds, cupData, copaAnalysis }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [calculating, setCalculating] = useState(false);
    const [copaResults, setCopaResults] = useState(null);
    const [selectedCopaRound, setSelectedCopaRound] = useState(null);

    // Prioritize globally pre-loaded analysis
    const effectiveCopaSanctions = useMemo(() => {
        return copaAnalysis?.sanctions || copaResults?.sanctions || [];
    }, [copaAnalysis, copaResults]);

    const filteredInfractions = useMemo(() => {
        const source = isCopa ? effectiveCopaSanctions : infractions;
        const cleanTerm = searchTerm.trim().toLowerCase();
        if (!cleanTerm) return source;
        return source.filter(inf =>
            (inf.team || inf.teamName || "").toLowerCase().includes(cleanTerm) ||
            (inf.player || inf.reason || "").toLowerCase().includes(cleanTerm)
        );
    }, [infractions, effectiveCopaSanctions, searchTerm, isCopa]);

    const handleCalculateCopa = async () => {
        if (!championshipId || !selectedCopaRound) return;

        setCalculating(true);
        try {
            // Find round data
            const roundData = rounds.find(r => r.number === selectedCopaRound || r._id === selectedCopaRound);
            if (!roundData) {
                console.error("Round not found");
                return;
            }

            const results = await CopaSanctionsService.calculateRoundSanctions(championshipId, roundData, roundData.number);
            setCopaResults(results);
        } catch (err) {
            console.error("Error calculating sanctions:", err);
            alert("Error al calcular sanciones. Revisa la consola.");
        } finally {
            setCalculating(false);
        }
    };

    if (!isCopa && (!infractions || infractions.length === 0)) {
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
                        <h2 style={{ fontSize: 'var(--font-xl)', background: 'none', WebkitTextFillColor: 'initial' }}>
                            {isCopa ? 'Calculadora Sanciones Copa' : 'Historial de Infracciones'}
                        </h2>
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
                            placeholder={isCopa ? "Buscar sanción..." : "Buscar por equipo o jugador..."}
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
                </div>
            </div>

            {isCopa && (
                <div className="copa-calculator-controls" style={{
                    marginBottom: '2rem',
                    padding: '1.5rem',
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                }}>
                    <select
                        value={selectedCopaRound || ''}
                        onChange={e => setSelectedCopaRound(Number(e.target.value))}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            background: '#1e293b',
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}
                    >
                        <option value="">Seleccionar Ronda...</option>
                        {rounds.map(r => (
                            <option key={r._id || r.number} value={r.number || r._id}>
                                {r.name || `Ronda ${r.number}`}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={handleCalculateCopa}
                        disabled={!selectedCopaRound || calculating}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1.5rem',
                            background: 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: (!selectedCopaRound || calculating) ? 'not-allowed' : 'pointer',
                            opacity: (!selectedCopaRound || calculating) ? 0.5 : 1
                        }}
                    >
                        {calculating ? <Loader2 className="animate-spin" size={18} /> : <Calculator size={18} />}
                        {calculating ? 'Calculando...' : 'Calcular Sanciones'}
                    </button>

                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: 'auto' }}>
                        *Puede tardar unos segundos en analizar todas las alineaciones
                    </span>
                </div>
            )}

            <div className="responsive-table-container card" style={{ padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', minWidth: '600px' }}>
                    <thead>
                        <tr style={{ background: '#1e293b', textAlign: 'left' }}>
                            <th style={{ padding: '1rem', borderBottom: '1px solid #334155' }}>Ronda/Jornada</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid #334155' }}>Equipo</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid #334155' }}>Motivo</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid #334155', textAlign: 'right' }}>Multa</th>
                        </tr>
                    </thead>
                    <motion.tbody layout>
                        <AnimatePresence initial={false}>
                            {filteredInfractions.length > 0 ? (
                                filteredInfractions.map((inf, idx) => {
                                    // Handle differences between standard infractions and Copa results
                                    const teamName = inf.teamName || inf.team;
                                    const reason = inf.type ? (inf.type + (inf.player ? ` (${inf.player})` : '')) : inf.reason;
                                    const cost = inf.cost || inf.amount;
                                    const round = inf.round;

                                    return (
                                        <motion.tr
                                            key={idx}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            layout
                                            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                                        >
                                            <td style={{ padding: '1rem' }}>{isCopa ? `Ronda ${round}` : `J${round}`}</td>
                                            <td style={{ padding: '1rem', fontWeight: 600 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <img
                                                        src={getTeamShield(teamName)}
                                                        alt={teamName}
                                                        style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                    />
                                                    <span>{teamName}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem' }}>{reason}</td>
                                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>{cost}€</td>
                                        </motion.tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                                        {isCopa ? (cupData?.copaAnalysis ? 'No hay sanciones detectadas' : 'Analizando Copa...') : 'No hay sanciones'}
                                    </td>
                                </tr>
                            )}
                        </AnimatePresence>
                    </motion.tbody>
                </table>
            </div>
        </div>
    );
}

export default InfractionsPanel;
