import { useState } from 'react';
import { Trophy, AlertTriangle, ShieldAlert, Search } from 'lucide-react';
import { getTeamShield } from '../utils/assets';

function CaptainsPanel({ sanctionsData, rounds }) {
    const [searchTerm, setSearchTerm] = useState('');

    if (!sanctionsData || Object.keys(sanctionsData).length === 0) {
        return <div className="text-center p-4">Cargando historial de capitanes...</div>;
    }

    const teamIds = Object.keys(sanctionsData).filter(tid =>
        sanctionsData[tid].name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Collect all unique round numbers from all teams
    const allRoundNums = new Set();
    Object.keys(sanctionsData).forEach(tid => {
        sanctionsData[tid].captainHistory.forEach(h => allRoundNums.add(h.round));
    });
    const sortedRoundNums = Array.from(allRoundNums).sort((a, b) => a - b);

    return (
        <div className="captains-panel">
            <div className="flex-between" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '280px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                        <input
                            type="text"
                            placeholder="Filtrar por equipo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="sidebar-select"
                            style={{ width: '100%', paddingLeft: '2.8rem' }}
                        />
                    </div>
                </div>

                <div style={{ padding: '0.8rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', fontSize: '0.85rem', flex: 1.5 }}>
                    <p style={{ margin: 0 }}>
                        <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>Warning:</span> 2ª vez.
                        <span style={{ color: '#ef4444', fontWeight: 'bold', marginLeft: '0.5rem' }}>Sanción:</span> 3ª+.
                    </p>
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
                        {teamIds.map(tid => {
                            const team = sanctionsData[tid];
                            return (
                                <tr key={tid} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '0.8rem', fontWeight: 600, position: 'sticky', left: 0, background: '#0f172a', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
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
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default CaptainsPanel;
