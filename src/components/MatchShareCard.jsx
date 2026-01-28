import React, { useRef, useMemo } from 'react';
import html2canvas from 'html2canvas';
import { Download, X, Laugh } from 'lucide-react';
import { getTeamShield } from '../utils/assets';
import './MatchShareCard.css';

const BANTER_MESSAGES = [
    "¡Vaya paliza, paquete!",
    "A pastar al campo...",
    "¿Has probado el Parchís?",
    "Ni con 12 ganas esto.",
    "Búscate otro hobby.",
    "Humillación nivel leyenda.",
    "¿Esto es tu equipo o un chiste?",
    "Vende a todos y empieza de cero.",
    "Lágrimas de perdedor... ¡deliciosas!",
    "Dime qué se siente al ser tan malo.",
    "Tu abuela con tacones defiende mejor.",
    "Menudo baño te han pegado.",
    "¿Te devuelvo el dinero de la inscripción?",
    "Hoy duermes en el sofá.",
    "Eres el hazmerreír de la liga.",
    "¡GAME OVER, pringao!",
    "A fregar la liga...",
    "Basta ya de hacer el ridículo.",
    "Te han borrado del mapa.",
    "¡ESTÁS ACABADO!"
];

const SCENES = [
    'throne',       // Winner on top of loser
    'burial',       // Loser in coffin/ground
    'spanking',     // Physical "lesson"
    'shame',        // Pointing and laughing
    'clown',        // Loser with clown nose/wig
    'trash',        // Loser in a trash can
    'baby',         // Loser as a baby crying
    'toilet'        // Loser being "flushed"
];

const MatchShareCard = ({ match, onClose }) => {
    const cardRef = useRef(null);

    const homeScore = match.homeScore;
    const awayScore = match.awayScore;
    const isHomeWinner = homeScore > awayScore;
    const isAwayWinner = awayScore > homeScore;
    const isDraw = homeScore === awayScore;

    const { scene, message, trollIcon } = useMemo(() => {
        const randomScene = SCENES[Math.floor(Math.random() * SCENES.length)];
        const randomMessage = BANTER_MESSAGES[Math.floor(Math.random() * BANTER_MESSAGES.length)];
        const trollIcons = ['🤡', '💩', '🤮', '🤣', '🤫', '💀', '🤏', '🔥'];
        return {
            scene: randomScene,
            message: randomMessage,
            trollIcon: trollIcons[Math.floor(Math.random() * trollIcons.length)]
        };
    }, []);

    const winnerEffect = useMemo(() => {
        const winnerName = (isHomeWinner ? match.homeTeam : match.awayTeam) || '';
        const nameUpper = winnerName.toUpperCase();
        if (nameUpper.includes('HURACÁN') || nameUpper.includes('HURACAN')) return '🌪️';
        if (nameUpper.includes('RAYO') || nameUpper.includes('ELÉCTRICO')) return '⚡';
        if (nameUpper.includes('FUEGO') || nameUpper.includes('DRAGÓN') || nameUpper.includes('DRAGON')) return '🔥';
        if (nameUpper.includes('CHOLISM')) return '🗡️';
        if (nameUpper.includes('MORRITOS')) return '💋';
        if (nameUpper.includes('TETITAS')) return '🍼';
        if (nameUpper.includes('SAMBA')) return '💃';
        return '💸';
    }, [isHomeWinner, isAwayWinner, match]);

    const exportImage = async () => {
        if (!cardRef.current) return;
        try {
            const canvas = await html2canvas(cardRef.current, {
                useCORS: true,
                scale: 3,
                backgroundColor: '#020617'
            });
            const image = canvas.toDataURL("image/png");
            const link = document.createElement('a');
            link.href = image;
            link.download = `HUMILLACION_${match.homeTeam}_vs_${match.awayTeam}.png`;
            link.click();
        } catch (error) {
            console.error('Error generating image:', error);
        }
    };

    const President = ({ type, isHome }) => {
        const teamName = isHome ? match.homeTeam : match.awayTeam;
        const color = isHome ? '#3b82f6' : '#ef4444';

        return (
            <div className={`president-char ${type} ${isHome ? 'home-pres' : 'away-pres'}`}>
                {/* Visual context based on scene */}
                <div className="pres-head-container">
                    {type === 'winner' && <div className="winner-crown">👑</div>}
                    <div className="pres-head">
                        {type === 'winner' ? '😆' : (scene === 'clown' && type === 'loser' ? '🤡' : (scene === 'baby' ? '👶' : '😭'))}
                    </div>
                </div>

                <div className="pres-body" style={{ flex: 1, backgroundColor: color }}>
                    <div className="label-on-shirt">{teamName.substring(0, 10)}</div>
                    <div className="pres-shield-container">
                        <img src={getTeamShield(teamName)} alt="" className="pres-shield-mini" />
                    </div>
                </div>

                {scene !== 'toilet' && scene !== 'trash' && (
                    <div className="pres-legs">
                        <div className="leg" style={{ backgroundColor: color }}></div>
                        <div className="leg" style={{ backgroundColor: color }}></div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="share-modal-overlay" onClick={onClose}>
            <div className="share-modal-container" onClick={e => e.stopPropagation()}>
                <div className="share-modal-header">
                    <h3>HUMILLATION ENGINE v2.0 {trollIcon}</h3>
                    <button onClick={onClose} className="close-share"><X size={24} /></button>
                </div>

                <div className="card-preview-area">
                    <div className="cromo-card" ref={cardRef}>
                        <div className="cromo-inner">
                            <div className="cromo-header">
                                <span className="tournament-label">FUENTMONDO TROLL CUP</span>
                                <div className="banter-bubble">"{message}"</div>
                            </div>

                            <div className={`caricature-stage scene-${scene} ${isHomeWinner ? 'home-wins' : isAwayWinner ? 'away-wins' : 'is-draw'}`}>
                                {isDraw ? (
                                    <div className="draw-scene">
                                        <President type="neutral" isHome={true} />
                                        <div className="draw-icon">😴</div>
                                        <President type="neutral" isHome={false} />
                                    </div>
                                ) : (
                                    <>
                                        <President type={isHomeWinner ? 'winner' : 'loser'} isHome={true} />
                                        <President type={isAwayWinner ? 'winner' : 'loser'} isHome={false} />

                                        <div className="winner-aura">{winnerEffect}</div>

                                        {scene === 'trash' && <div className="trash-can">🗑️</div>}
                                        {scene === 'toilet' && <div className="toilet-bowl">🚽</div>}
                                        {scene === 'burial' && <div className="coffin">⚰️</div>}

                                        <div className="action-ribbon">
                                            {scene === 'throne' && "EL REY DE LOS PAQUETES"}
                                            {scene === 'burial' && "DEP PRINGAO"}
                                            {scene === 'spanking' && "ZASCA MONUMENTAL"}
                                            {scene === 'clown' && "MENUDO PAYASO"}
                                            {scene === 'trash' && "DERECHO A LA BASURA"}
                                            {scene === 'baby' && "A BUSCAR EL CHUPETE"}
                                            {scene === 'toilet' && "UN RESULTADO DE MIERDA"}
                                            {scene === 'shame' && "HUMILLADO EN PÚBLICO"}
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="cromo-footer">
                                <div className="cromo-score-row">
                                    <span className="team-n">{match.homeTeam}</span>
                                    <span className="final-nums">{homeScore} - {awayScore}</span>
                                    <span className="team-n">{match.awayTeam}</span>
                                </div>
                                <div className="troll-watermark">TROLL EDITION - NO APTO PARA SENSIBLES</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="share-actions">
                    <button className="download-btn-troll" onClick={exportImage}>
                        <Laugh size={24} className="meme-icon-spin" />
                        DESCARGAR Y HUMILLAR
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MatchShareCard;
