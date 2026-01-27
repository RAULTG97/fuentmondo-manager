import { useState } from 'react';
import { AlertTriangle, Search } from 'lucide-react';
import { getTeamShield } from '../utils/assets';

function InfractionsPanel({ infractions }) {
    const [searchTerm, setSearchTerm] = useState('');

    if (!infractions || infractions.length === 0) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                <p>No se han detectado infracciones de alineación.</p>
            </div>
        );
    }

    const filteredInfractions = infractions.filter(inf =>
        inf.teamName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="infractions-panel">
            <div className="flex-between" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '280px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                        <input
                            type="text"
                            placeholder="Buscar por equipo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="sidebar-select"
                            style={{ width: '100%', paddingLeft: '2.8rem' }}
                        />
                    </div>
                </div>

                <div style={{ padding: '0.8rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', fontSize: '0.8rem', flex: 1 }}>
                    <p style={{ margin: 0, color: '#fca5a5' }}>
                        Multa de <b>5€</b> adicionales por jornada si se alinean sancionados.
                    </p>
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
                    <tbody>
                        {filteredInfractions.map((inf, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '1rem' }}>J{inf.round}</td>
                                <td style={{ padding: '1rem', fontWeight: 600 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <img
                                            src={getTeamShield(inf.teamName)}
                                            alt={inf.teamName}
                                            style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                                            onError={(e) => e.target.style.display = 'none'}
                                        />
                                        <span>{inf.teamName}</span>
                                    </div>
                                </td>
                                <td style={{ padding: '1rem' }}>{inf.player}</td>
                                <td style={{ padding: '1rem', color: '#fca5a5' }}>{inf.type}</td>
                                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>{inf.cost}€</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default InfractionsPanel;
