import { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronRight, Euro } from 'lucide-react';
import { getTeamShield } from '../utils/assets';

function SanctionsPanel({ sanctionsData }) {
    const [expandedTeam, setExpandedTeam] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    if (!sanctionsData || Object.keys(sanctionsData).length === 0) {
        return <div className="text-center p-4">Cargando sanciones...</div>;
    }

    const filteredTeams = Object.values(sanctionsData).filter(team =>
        team.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sortedTeams = filteredTeams.sort((a, b) => b.total - a.total);

    return (
        <div className="sanctions-panel">
            <div className="search-container" style={{ marginBottom: '1rem' }}>
                <input
                    type="text"
                    placeholder="Buscar equipo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="sidebar-select"
                    style={{ width: '100%', padding: '0.8rem 1rem' }}
                />
            </div>

            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <AlertCircle color="#ef4444" size={24} />
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#fca5a5' }}>
                    Sanciones acumuladas: Repetición de capitán, jugadores duplicados H2H, y duplicidad de club.
                </p>
            </div>

            <div className="grid" style={{ gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                {sortedTeams.map(team => (
                    <div key={team.id} className="card" style={{ padding: '0', overflow: 'hidden' }}>
                        <div
                            onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
                            style={{
                                padding: '1rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                background: expandedTeam === team.id ? 'rgba(255,255,255,0.03)' : 'transparent'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                {expandedTeam === team.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <img
                                        src={getTeamShield(team.name)}
                                        alt=""
                                        style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                    <span style={{ fontWeight: 600 }}>{team.name}</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontWeight: 'bold', fontSize: '1.2rem' }}>
                                {team.total}€
                                <Euro size={18} />
                            </div>
                        </div>

                        {expandedTeam === team.id && (
                            <div style={{ padding: '0 1rem 1rem 1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                {team.breakdown.length === 0 ? (
                                    <p style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.9rem' }}>Sin sanciones registradas.</p>
                                ) : (
                                    <div className="responsive-table-container">
                                        <table style={{ width: '100%', fontSize: '0.85rem', marginTop: '1rem', minWidth: '500px' }}>
                                            <thead>
                                                <tr style={{ textAlign: 'left', opacity: 0.5 }}>
                                                    <th style={{ paddingBottom: '0.5rem' }}>Jornada</th>
                                                    <th style={{ paddingBottom: '0.5rem' }}>Motivo</th>
                                                    <th style={{ paddingBottom: '0.5rem' }}>Detalle</th>
                                                    <th style={{ paddingBottom: '0.5rem', textAlign: 'right' }}>Coste</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {team.breakdown.map((item, idx) => (
                                                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                                        <td style={{ padding: '0.4rem 0' }}>J{item.round}</td>
                                                        <td style={{ padding: '0.4rem 0', color: '#fca5a5' }}>{item.type}</td>
                                                        <td style={{ padding: '0.4rem 0', opacity: 0.8 }}>{item.detail}</td>
                                                        <td style={{ padding: '0.4rem 0', textAlign: 'right', fontWeight: 'bold' }}>{item.cost}€</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default SanctionsPanel;
