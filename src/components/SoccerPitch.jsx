import React from 'react';
import { Crown, User } from 'lucide-react';
import './SoccerPitch.css';

function SoccerPitch({ players, compact = false }) {
    // Group by role. Roles from API are: portero, defensa, centrocampista, delantero
    const groups = {
        gk: players.filter(p => p.role === 'portero'),
        def: players.filter(p => p.role === 'defensa'),
        mid: players.filter(p => p.role === 'centrocampista'),
        fwd: players.filter(p => p.role === 'delantero')
    };

    return (
        <div className={`soccer-pitch ${compact ? 'compact' : 'large'}`}>
            <div className="pitch-grass">
                {/* Lines */}
                <div className="pitch-line center-line"></div>
                <div className="pitch-circle center-circle"></div>
                <div className="pitch-box penalty-box-top"></div>

                <div className="pitch-formation">
                    {/* GK */}
                    <div className="pitch-row">
                        {groups.gk.map((p, i) => <PlayerToken key={i} player={p} compact={compact} />)}
                    </div>

                    {/* DEF */}
                    <div className="pitch-row">
                        {groups.def.map((p, i) => <PlayerToken key={i} player={p} compact={compact} />)}
                    </div>

                    {/* MID */}
                    <div className="pitch-row">
                        {groups.mid.map((p, i) => <PlayerToken key={i} player={p} compact={compact} />)}
                    </div>

                    {/* FWD */}
                    <div className="pitch-row">
                        {groups.fwd.map((p, i) => <PlayerToken key={i} player={p} compact={compact} />)}
                    </div>
                </div>
            </div>
        </div>
    );
}

function PlayerToken({ player, compact }) {
    const isCaptain = !!player.captain || player.role === 'captain' || player.cpt;
    const pts = player.points ?? 0;
    const ptsColor = pts > 5 ? '#22c55e' : (pts < 0 ? '#ef4444' : '#3b82f6');

    return (
        <div className="player-token">
            <div className={`player-avatar-container ${isCaptain ? 'is-captain' : ''}`}>
                <User size={compact ? 18 : 24} color="#333" />

                {/* Points Badge */}
                <div className="player-pts-badge" style={{ backgroundColor: ptsColor }}>
                    {pts}
                </div>

                {isCaptain && (
                    <div className="captain-crown">
                        <Crown size={compact ? 10 : 14} fill="#fbbf24" color="#fbbf24" />
                    </div>
                )}
            </div>

            <div className="player-name-label">
                {player.name}
            </div>
        </div>
    );
}

export default SoccerPitch;
