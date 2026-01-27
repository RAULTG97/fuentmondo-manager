import { X, Shirt } from 'lucide-react';

function LineupViewer({ userTeam, onClose }) {
    if (!userTeam) return null;

    // Handle External API structure: userTeam.players.initial is the array
    // Also fallback for structure { lineup: [] } or { players: [] }
    let players = [];
    if (userTeam.players && userTeam.players.initial) {
        players = userTeam.players.initial;
    } else if (Array.isArray(userTeam.players)) {
        players = userTeam.players;
    } else if (Array.isArray(userTeam.lineup)) {
        players = userTeam.lineup;
    }

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="card fade-in" style={{ width: '90%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto', position: 'relative' }}>
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', padding: 0 }}
                >
                    <X size={24} color="white" />
                </button>

                <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Shirt size={20} className="text-primary" />
                    Alineación: {userTeam.userteam ? userTeam.userteam.name : userTeam.name}
                </h3>

                {players.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>
                        No hay jugadores disponibles para esta jornada.
                    </p>
                ) : (
                    <div className="grid" style={{ gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                        {players.map((p, idx) => (
                            <div key={p.id || idx} style={{
                                display: 'flex', justifyContent: 'space-between', padding: '0.8rem',
                                backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.role}</span>
                                </div>
                                <div style={{ fontWeight: 'bold', color: p.points > 5 ? '#4ade80' : 'white' }}>
                                    {p.points !== undefined ? `${p.points} pts` : ''}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default LineupViewer;
