import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, History, AlertCircle, Search, Ban, Timer } from 'lucide-react';
import { useTournament } from '../context/TournamentContext';
import { getTeamShield } from '../utils/assets';
import EmptyState from './common/EmptyState';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, x: -15 },
    visible: {
        opacity: 1,
        x: 0,
        transition: { type: 'spring', damping: 25, stiffness: 120 }
    }
};

const SanctionedCaptainsPanel = () => {
    const { sanctionsData, selectedRoundId, rounds } = useTournament();
    const [filter, setFilter] = useState('current'); // 'current' | 'historical'
    const [searchTerm, setSearchTerm] = useState('');

    const currentRound = rounds.find(r => r._id === selectedRoundId)?.number || 0;

    // Use activeSanctions directly from the calculated data
    const allSanctions = sanctionsData.activeSanctions || [];

    const filteredTotal = allSanctions.filter(s =>
        s.teamName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.player?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const currentSanctions = filteredTotal.filter(s => s.noCaptUntil >= currentRound);
    const historicalSanctions = filteredTotal.filter(s => s.noCaptUntil < currentRound);

    const displayedSanctions = filter === 'current' ? currentSanctions : historicalSanctions;

    return (
        <div className="infractions-container">
            <div className="dashboard-header" style={{ border: 'none', padding: 0, marginBottom: '2.5rem', alignItems: 'flex-start' }}>
                <div className="header-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h2 style={{ fontSize: 'var(--font-xl)', background: 'none', webkitTextFillColor: 'initial' }}>Sanciones por Capitanía</h2>
                        <span className="badge">
                            {filter === 'current' ? 'En Curso' : 'Histórico'}
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', width: '100%', maxWidth: '800px' }}>
                    <div className="round-picker" style={{ flex: 1, minWidth: '250px', gap: '0.75rem' }}>
                        <Search size={18} color="var(--text-dim)" />
                        <input
                            type="text"
                            placeholder="Buscar por equipo o jugador..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-main)',
                                outline: 'none',
                                fontSize: 'var(--font-sm)',
                                width: '100%'
                            }}
                        />
                    </div>

                    <div className="round-picker" style={{ gap: '0.5rem', padding: '0.4rem' }}>
                        <button
                            onClick={() => setFilter('current')}
                            style={{
                                background: filter === 'current' ? 'var(--primary)' : 'transparent',
                                border: 'none',
                                color: filter === 'current' ? 'white' : 'var(--text-muted)',
                                padding: '0.6rem 1.25rem',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontSize: 'var(--font-xs)',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.2s'
                            }}
                        >
                            <AlertCircle size={16} /> En Curso ({currentSanctions.length})
                        </button>
                        <button
                            onClick={() => setFilter('historical')}
                            style={{
                                background: filter === 'historical' ? 'var(--text-muted)' : 'transparent',
                                border: 'none',
                                color: filter === 'historical' ? 'var(--bg-main)' : 'var(--text-muted)',
                                padding: '0.6rem 1.25rem',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontSize: 'var(--font-xs)',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.2s'
                            }}
                        >
                            <History size={16} /> Histórico ({historicalSanctions.length})
                        </button>
                    </div>
                </div>
            </div>

            <motion.div
                className="glass-premium"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    background: 'rgba(59, 130, 246, 0.03)',
                    padding: '1.25rem',
                    marginBottom: '2.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    borderRadius: 'var(--radius-md)'
                }}
            >
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.5rem', borderRadius: '50%' }}>
                    <ShieldAlert size={20} color="var(--primary)" />
                </div>
                <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)', margin: 0 }}>
                    <strong style={{ color: 'var(--text-main)' }}>Regla de Sanción:</strong> Cada 3ª capitanía conlleva <span style={{ color: 'var(--error)' }}>3 partidos fuera</span> y <span style={{ color: 'var(--warning)' }}>6 partidos sin poder ser elegido capitán</span>.
                </p>
            </motion.div>

            <AnimatePresence mode="wait">
                {displayedSanctions.length === 0 ? (
                    <EmptyState
                        key="empty"
                        icon={Ban}
                        title={filter === 'current' ? "Sin sanciones en curso" : "Sin historial de sanciones"}
                        description={searchTerm ? "No hay resultados que coincidan con tu búsqueda." : "No se han registrado sanciones en este periodo."}
                    />
                ) : (
                    <motion.div
                        key={filter}
                        className="grid"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '2rem' }}
                    >
                        {displayedSanctions.map((s, idx) => {
                            const startRound = s.outTeamUntil - 2;
                            const referenceRound = Math.max(currentRound, startRound);

                            const outTeamRoundsLeft = Math.max(0, s.outTeamUntil - referenceRound + 1);
                            const totalNoCaptLeft = Math.max(0, s.noCaptUntil - referenceRound + 1);

                            return (
                                <motion.div
                                    key={`${s.player}-${idx}`}
                                    variants={itemVariants}
                                    className="card"
                                    style={{
                                        padding: '1.75rem',
                                        borderRadius: 'var(--radius-lg)',
                                        border: '1px solid var(--glass-border)',
                                        opacity: filter === 'historical' ? 0.8 : 1,
                                        position: 'relative',
                                        overflow: 'hidden',
                                        transition: 'all 0.3s ease'
                                    }}
                                    whileHover={{ y: -6, borderColor: 'rgba(59, 130, 246, 0.4)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ padding: '0.6rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                                                <img
                                                    src={getTeamShield(s.teamName)}
                                                    alt="Shield"
                                                    style={{ width: '42px', height: '42px', objectFit: 'contain' }}
                                                    onError={(e) => { e.target.style.opacity = '0'; }}
                                                />
                                            </div>
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: 'var(--font-lg)', fontWeight: 800 }}>{s.player}</h4>
                                                <p style={{ margin: 0, fontSize: 'var(--font-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.teamName}</p>
                                            </div>
                                        </div>
                                        <div style={{ opacity: filter === 'current' ? 1 : 0.5 }}>
                                            {outTeamRoundsLeft > 0 ? (
                                                <Ban size={22} color="var(--error)" />
                                            ) : (
                                                <Timer size={22} color="var(--warning)" />
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
                                            <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                <Ban size={14} color="var(--error)" /> Fuera del equipo:
                                            </span>
                                            <span style={{ fontSize: 'var(--font-sm)', fontWeight: 800, color: outTeamRoundsLeft > 0 ? 'var(--error)' : 'var(--success)' }}>
                                                {outTeamRoundsLeft > 0 ? `${outTeamRoundsLeft} jornadas` : 'Cumplido'}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
                                            <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                <Timer size={14} color="var(--warning)" /> Sin capitanía:
                                            </span>
                                            <span style={{ fontSize: 'var(--font-sm)', fontWeight: 800, color: totalNoCaptLeft > 0 ? 'var(--warning)' : 'var(--success)' }}>
                                                {totalNoCaptLeft > 0 ? `${totalNoCaptLeft} jornadas` : 'Cumplido'}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--glass-border)', textAlign: 'center' }}>
                                        <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-dim)', fontWeight: 500 }}>
                                            Periodo: J{s.outTeamUntil - 2} — J{s.noCaptUntil}
                                        </span>
                                    </div>

                                    {filter === 'current' && (
                                        <div style={{
                                            position: 'absolute',
                                            top: 0,
                                            right: 0,
                                            width: '4px',
                                            height: '100%',
                                            background: outTeamRoundsLeft > 0 ? 'var(--error)' : 'var(--warning)'
                                        }} />
                                    )}
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SanctionedCaptainsPanel;
