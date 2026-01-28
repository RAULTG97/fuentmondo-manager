import { useState, useMemo, memo } from 'react';
import { Trophy, AlertTriangle, ShieldAlert, Search, X } from 'lucide-react';
import { getTeamShield } from '../utils/assets';

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
            const usage = team.captainHistory.find(h => h.round === rNum);
            let cellStyle = { padding: '0.5rem', textAlign: 'center', fontSize: '0.85rem' };
            if (usage?.alert) cellStyle.background = 'rgba(239, 68, 68, 0.1)';
            else if (usage?.warning) cellStyle.background = 'rgba(251, 191, 36, 0.05)';

            return (
                <td key={rNum} style={cellStyle}>
                    {usage ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            {usage.alert ? <ShieldAlert size={14} color="#ef4444" /> :
                                usage.warning ? <AlertTriangle size={14} color="#fbbf24" /> :
                                    <Trophy size={14} color="#fbbf24" opacity={0.6} />}
                            <span style={{ fontWeight: (usage.alert || usage.warning) ? 700 : 400 }}>{usage.player}</span>
                            {usage.alert && <span style={{ fontSize: '0.7rem', color: '#ef4444' }}>Sanción</span>}
                        </div>
                    ) : '-'}
                </td>
            );
        })}
    </tr>
));

function CaptainsPanel({ sanctionsData, rounds }) {
    const [searchTerm, setSearchTerm] = useState('');

    const teamIds = useMemo(() => {
        const cleanTerm = searchTerm.trim().toLowerCase();
        if (!cleanTerm) return Object.keys(sanctionsData);

        return Object.keys(sanctionsData).filter(tid =>
            sanctionsData[tid].name.toLowerCase().includes(cleanTerm) ||
            sanctionsData[tid].captainHistory.some(h => h.player.toLowerCase().includes(cleanTerm))
        );
    }, [sanctionsData, searchTerm]);

    // Collect all unique round numbers from all teams
    const sortedRoundNums = useMemo(() => {
        const allRoundNums = new Set();
        Object.keys(sanctionsData).forEach(tid => {
            sanctionsData[tid].captainHistory.forEach(h => allRoundNums.add(h.round));
        });
        return Array.from(allRoundNums).sort((a, b) => a - b);
    }, [sanctionsData]);

    if (!sanctionsData || Object.keys(sanctionsData).length === 0) {
        return <div className="text-center p-4">Cargando historial de capitanes...</div>;
    }

    return (
        <div className="captains-panel">
            <div className="dashboard-header" style={{ border: 'none', padding: 0, marginBottom: '2rem', alignItems: 'flex-start' }}>
                <div className="header-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h2 style={{ fontSize: 'var(--font-xl)', background: 'none', webkitTextFillColor: 'initial' }}>Historial de Capitanes</h2>
                        <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' }}>
                            {teamIds.length} Equipos
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

                    <div className="round-picker" style={{ gap: '0.8rem', padding: '0.6rem 1rem', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                        <ShieldAlert size={16} color="var(--primary)" />
                        <p style={{ margin: 0, fontSize: 'var(--font-xs)', fontWeight: 500 }}>
                            <span style={{ color: '#fbbf24', fontWeight: '800' }}>Aviso:</span> 2ª vez.
                            <span style={{ color: '#ef4444', fontWeight: '800', marginLeft: '0.8rem' }}>Sanción:</span> 3ª vez+.
                        </p>
                    </div>
                </div>
            </div>

            <div className="responsive-table-container">
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                    <thead>
                        <tr style={{ background: '#1e293b' }}>
                            <th style={{ padding: '0.8rem', textAlign: 'left', borderBottom: '1px solid #334155', position: 'sticky', left: 0, background: '#1e293b', zIndex: 10 }}>Equipo</th>
                            {sortedRoundNums.map(rNum => (
                                <th key={rNum} style={{ padding: '0.8rem', textAlign: 'center', borderBottom: '1px solid #334155', minWidth: '100px', opacity: rNum <= 19 ? 0.7 : 1 }}>
                                    J{rNum}
                                    {rNum <= 19 && <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Invierno</div>}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {teamIds.map(tid => (
                            <CaptainRow
                                key={tid}
                                tid={tid}
                                team={sanctionsData[tid]}
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
