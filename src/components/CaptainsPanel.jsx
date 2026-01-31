import { useState, useMemo, memo, useEffect } from 'react';
import { Trophy, AlertTriangle, ShieldAlert, Search, X, Loader2 } from 'lucide-react';
import { getTeamShield } from '../utils/assets';
import { CopaSanctionsService } from '../services/copaSanctionsService';

const CaptainRow = memo(({ tid, team, sortedRoundNums }) => (
    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <td style={{ padding: '0.8rem', fontWeight: 600, position: 'sticky', left: 0, background: '#0f172a', borderRight: '1px solid rgba(255,255,255,0.05)', zIndex: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <img
                    src={getTeamShield(team.name)}
                    alt=""
                    style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                />
                {team.name}
            </div>
        </td>
        {sortedRoundNums.map(rNum => {
            // Find ALL usages for this round (could be "1", "1.1", "1.2", etc.)
            const usages = team.captainHistory.filter(h =>
                String(h.round) === String(rNum) ||
                String(h.round).startsWith(`${rNum}.`)
            );

            return (
                <td key={rNum} style={{ padding: '0.5rem', textAlign: 'center', verticalAlign: 'middle' }}>
                    {usages.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {usages.map((usage, idx) => {
                                let cellStyle = {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px',
                                    borderRadius: '4px',
                                    background: usage.alert ? 'rgba(239, 68, 68, 0.1)' :
                                        usage.warning ? 'rgba(251, 191, 36, 0.05)' : 'transparent'
                                };

                                return (
                                    <div key={idx} style={cellStyle}>
                                        {usages.length > 1 && (
                                            <span style={{ fontSize: '0.6rem', opacity: 0.4, textTransform: 'uppercase' }}>
                                                {String(usage.round).includes('.1') ? 'Ida' : 'Vuelta'}
                                            </span>
                                        )}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            {usage.alert ? <ShieldAlert size={12} color="#ef4444" /> :
                                                usage.warning ? <AlertTriangle size={12} color="#fbbf24" /> :
                                                    <Trophy size={12} color="#fbbf24" opacity={0.6} />}
                                            <span style={{
                                                fontWeight: (usage.alert || usage.warning) ? 700 : 400,
                                                fontSize: usages.length > 1 ? '0.75rem' : '0.85rem'
                                            }}>
                                                {usage.player}
                                            </span>
                                        </div>
                                        {usage.alert && <span style={{ fontSize: '0.6rem', color: '#ef4444' }}>Sanción</span>}
                                    </div>
                                );
                            })}
                        </div>
                    ) : '-'}
                </td>
            );
        })}
    </tr>
));

function CaptainsPanel({ sanctionsData, rounds, isCopa, cupData, copaAnalysis, championshipId }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingCopa, setLoadingCopa] = useState(false);
    const [copaStats, setCopaStats] = useState(null);

    // Auto-load Copa data if active
    useEffect(() => {
        if (isCopa && championshipId && cupData && !copaStats && !loadingCopa) {
            setLoadingCopa(true);
            CopaSanctionsService.scanCopaAndCalculate(championshipId, cupData)
                .then(result => {
                    setCopaStats(result.captainHistory);
                })
                .catch(err => console.error("Error loading Copa stats:", err))
                .finally(() => setLoadingCopa(false));
        }
    }, [isCopa, championshipId, cupData]); // Removed copaStats/loadingCopa from deps to avoid loops if needed, but safe here with checks

    // Use either prop data (League) or fetched data (Copa)
    // For Copa, we now prioritize the pre-loaded copaAnalysis from context
    const activeData = isCopa ? (copaAnalysis?.captainHistory || copaStats || {}) : sanctionsData;

    const teamIds = useMemo(() => {
        const cleanTerm = searchTerm.trim().toLowerCase();
        if (!cleanTerm) return Object.keys(activeData);

        return Object.keys(activeData).filter(tid =>
            activeData[tid].name.toLowerCase().includes(cleanTerm) ||
            activeData[tid].captainHistory.some(h => h.player.toLowerCase().includes(cleanTerm))
        );
    }, [activeData, searchTerm]);

    // Collect all unique round numbers for columns
    // For Copa, use the actual rounds available in cupData
    const sortedRoundNums = useMemo(() => {
        if (isCopa && cupData?.rounds) {
            return cupData.rounds.map(r => r.number).sort((a, b) => a - b);
        }
        const allRoundNums = new Set();
        Object.keys(activeData).forEach(tid => {
            activeData[tid].captainHistory.forEach(h => allRoundNums.add(h.round));
        });
        return Array.from(allRoundNums).sort((a, b) => a - b);
    }, [activeData, isCopa, cupData]);

    if (!isCopa && (!sanctionsData || Object.keys(sanctionsData).length === 0)) {
        return <div className="text-center p-4">Cargando historial de capitanes...</div>;
    }

    return (
        <div className="captains-panel">
            <div className="dashboard-header" style={{ border: 'none', padding: 0, marginBottom: '2rem', alignItems: 'flex-start' }}>
                <div className="header-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h2 style={{ fontSize: 'var(--font-xl)', background: 'none', WebkitTextFillColor: 'initial' }}>
                            {isCopa ? 'Capitanes Copa Piraña' : 'Historial de Capitanes'}
                        </h2>
                        <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' }}>
                            {teamIds.length} Equipos
                        </span>
                        {loadingCopa && <Loader2 className="animate-spin" size={20} color="var(--primary)" />}
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

                    {!isCopa && (
                        <div className="round-picker" style={{ gap: '0.8rem', padding: '0.6rem 1rem', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                            <ShieldAlert size={16} color="var(--primary)" />
                            <p style={{ margin: 0, fontSize: 'var(--font-xs)', fontWeight: 500 }}>
                                <span style={{ color: '#fbbf24', fontWeight: '800' }}>Aviso:</span> 2ª vez.
                                <span style={{ color: '#ef4444', fontWeight: '800', marginLeft: '0.8rem' }}>Sanción:</span> 3ª vez+.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <div className="responsive-table-container">
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                    <thead>
                        <tr style={{ background: '#1e293b' }}>
                            <th style={{ padding: '0.8rem', textAlign: 'left', borderBottom: '1px solid #334155', position: 'sticky', left: 0, background: '#1e293b', zIndex: 10 }}>Equipo</th>
                            {sortedRoundNums.map(rNum => (
                                <th key={rNum} style={{ padding: '0.8rem', textAlign: 'center', borderBottom: '1px solid #334155', minWidth: '100px', opacity: (rNum <= 19 && !isCopa) ? 0.7 : 1 }}>
                                    {isCopa ? `Ronda ${rNum}` : `J${rNum}`}
                                    {isCopa && (rNum === 1 || rNum === 2) && <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Ida/Vuelta</div>}
                                    {(!isCopa && rNum <= 19) && <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Invierno</div>}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {teamIds.map(tid => (
                            <CaptainRow
                                key={tid}
                                tid={tid}
                                team={activeData[tid]}
                                sortedRoundNums={sortedRoundNums}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default CaptainsPanel;
