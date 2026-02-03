import React from 'react';
import { motion } from 'framer-motion';
import { Crown, User } from 'lucide-react';
import './SoccerPitch.css';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2
        }
    }
};

const playerVariants = {
    hidden: { opacity: 0, scale: 0.5, y: 20 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { type: 'spring', damping: 15, stiffness: 200 }
    }
};

function SoccerPitch({ players, compact = false }) {
    // Group by role. Roles from API are: portero, defensa, centrocampista, delantero
    const groups = {
        gk: players.filter(p => p.role === 'portero'),
        def: players.filter(p => p.role === 'defensa'),
        mid: players.filter(p => p.role === 'centrocampista'),
        fwd: players.filter(p => p.role === 'delantero'),
        others: players.filter(p =>
            p.role !== 'portero' &&
            p.role !== 'defensa' &&
            p.role !== 'centrocampista' &&
            p.role !== 'delantero'
        )
    };

    return (
        <div className={`soccer-pitch ${compact ? 'compact' : 'large'}`}>
            <div className="pitch-grass">
                {/* Markings */}
                <div className="pitch-line center-line"></div>
                <div className="center-circle"></div>
                <div className="penalty-box-top"></div>

                <motion.div
                    className="pitch-formation"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {/* GK */}
                    {groups.gk.length > 0 && (
                        <div className="pitch-row">
                            {groups.gk.map((p, i) => <PlayerToken key={`gk-${i}`} player={p} compact={compact} />)}
                        </div>
                    )}

                    {/* DEF */}
                    {groups.def.length > 0 && (
                        <div className="pitch-row">
                            {groups.def.map((p, i) => <PlayerToken key={`def-${i}`} player={p} compact={compact} />)}
                        </div>
                    )}

                    {/* MID */}
                    {groups.mid.length > 0 && (
                        <div className="pitch-row">
                            {groups.mid.map((p, i) => <PlayerToken key={`mid-${i}`} player={p} compact={compact} />)}
                        </div>
                    )}

                    {/* FWD */}
                    {groups.fwd.length > 0 && (
                        <div className="pitch-row">
                            {groups.fwd.map((p, i) => <PlayerToken key={`fwd-${i}`} player={p} compact={compact} />)}
                        </div>
                    )}

                    {/* OTHERS / SUBS */}
                    {groups.others.length > 0 && (
                        <div className="pitch-row others-row">
                            {groups.others.map((p, i) => <PlayerToken key={`other-${i}`} player={p} compact={compact} />)}
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}

function PlayerToken({ player, compact }) {
    const isCaptain = !!player.captain || player.role === 'captain' || player.cpt;
    const pts = player.points ?? 0;
    const ptsColor = pts > 5 ? 'var(--success)' : (pts < 0 ? 'var(--error)' : 'var(--primary)');

    return (
        <motion.div className="player-token" variants={playerVariants} whileHover={{ y: -5 }}>
            <div className={`player-avatar-container ${isCaptain ? 'is-captain' : ''}`}>
                <User size={compact ? 20 : 28} color="#1e293b" strokeWidth={2.5} />

                {/* Points Badge */}
                <div className="player-pts-badge" style={{ backgroundColor: ptsColor }}>
                    {pts}
                </div>

                {isCaptain && (
                    <div className="captain-crown">
                        <Crown size={compact ? 12 : 18} fill="var(--accent)" color="var(--accent)" />
                    </div>
                )}
            </div>

            <div className="player-name-label">
                {player.name}
            </div>
        </motion.div>
    );
}

export default SoccerPitch;
