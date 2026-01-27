import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Calendar } from 'lucide-react';
import { getTeamShield } from '../utils/assets';
import './HallOfFame.css';

const champions = [
    {
        year: '2022/23',
        tournament: 'Fuentmondo',
        team: 'SICARIOS CF',
        type: 'league'
    },
    {
        year: '2023/24',
        tournament: 'Fuentmondo',
        team: 'Real Pezqueñines FC',
        type: 'league'
    },
    {
        year: '2024',
        tournament: 'Copa Piraña',
        team: 'Poli Ejido CF',
        type: 'cup'
    },
    {
        year: '2024/25',
        tournament: 'Fuentmondo',
        team: 'MORRITOS F.C.',
        type: 'league'
    },
    {
        year: '2025',
        tournament: 'Copa Piraña',
        team: 'AL-CARRER F.C.',
        type: 'cup'
    }
];

const HallOfFame = () => {
    React.useEffect(() => {
        const audio = new Audio('/halloffame.mp3');
        audio.volume = 0.5;

        const playPromise = audio.play();

        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log("Audio play failed:", error);
            });
        }

        return () => {
            audio.pause();
            audio.currentTime = 0;
        };
    }, []);

    return (
        <div className="hall-of-fame-container">
            <motion.div
                className="hall-of-fame-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <div className="hall-of-fame-icon-main">
                    <Trophy size={48} />
                </div>
                <h2 className="hall-of-fame-title">HALL OF FAME</h2>
                <p className="hall-of-fame-subtitle">Inmortalizando a los campeones de nuestra historia</p>
            </motion.div>

            <div className="timeline">
                <div className="timeline-line" />

                {champions.map((champ, index) => {
                    const isCup = champ.type === 'cup';
                    // Cup to the left, everything else to the right
                    const position = isCup ? 'left' : 'right';

                    return (
                        <motion.div
                            key={`${champ.year}-${champ.team}`}
                            className={`timeline-item ${position}`}
                            initial={{ opacity: 0, x: isCup ? -50 : 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                        >
                            <div className="timeline-content">
                                <div className="champ-card glass-premium">
                                    <div className="champ-header">
                                        <span className={`tournament-badge ${champ.type}`}>
                                            {champ.type === 'cup' ? '🏆 COPA' : '⚔️ LIGA'}
                                        </span>
                                        <span className="champ-year">{champ.year}</span>
                                    </div>

                                    <div className="champ-body">
                                        <div className="champ-shield-wrapper">
                                            <div className="shield-glow" />
                                            <img
                                                src={getTeamShield(champ.team)}
                                                alt={champ.team}
                                                className="champ-shield"
                                                onError={(e) => { e.target.src = '/logo.jpeg'; }}
                                            />
                                        </div>
                                        <div className="champ-info">
                                            <h3 className="champ-team-name">{champ.team}</h3>
                                            <p className="tournament-name">{champ.tournament}</p>
                                        </div>
                                    </div>

                                    <div className="champ-footer">
                                        <Star size={14} className="star-icon" />
                                        <span>CAMPEÓN OFICIAL</span>
                                        <Star size={14} className="star-icon" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default HallOfFame;
