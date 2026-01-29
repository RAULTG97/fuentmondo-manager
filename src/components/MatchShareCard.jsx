import React, { useRef, useMemo } from 'react';
import html2canvas from 'html2canvas';
import { Download, X, Laugh } from 'lucide-react';
import { getTeamShield } from '../utils/assets';
import './MatchShareCard.css';

const BANTER_MESSAGES = [
    "¡Vaya paliza, paquete! ¿Te has limpiado ya el culo?",
    "A pastar al campo, que das puto asco.",
    "¿Has probado el Parchís? Porque al fútbol eres un moñigo.",
    "Ni con 12 ganas esto, eres el hazmerreír de tu casa.",
    "Búscate otro hobby, la humillación es tu estado natural.",
    "¿Esto es tu equipo o una puta guardería de cojos?",
    "Vende a todos y retírate, me das vergüenza ajena.",
    "Lágrimas de perdedor... ¡deliciosas! Trágate mi éxito.",
    "Dime qué se siente al ser la puta zorra de la liga.",
    "Tu abuela con tacones tiene más huevos que tus defensas.",
    "Menudo baño de mierda te han pegado, ni con lejía te sale.",
    "¿Te devuelvo el dinero de la inscripción? Pobretón infame.",
    "Hoy duermes en el suelo como el perro que eres tras este baño.",
    "Eres el bufón oficial de Fuentmondo.",
    "¡GAME OVER, pringao de los cojones!",
    "Basta ya de dar sida visual en el campo.",
    "Te han borrado la dignidad, búscatela en el vertedero.",
    "¡ESTÁS ACABADO! Vete a jugar a las canicas, inútil.",
    "A fregar la liga, que aquí solo pintas el ridículo.",
    "Lo tuyo es para que te quiten el carnet de presidente.",
    "¿Ibas de gallito? ¡A la cazuela por bocas!",
    "Ni comprando al VAR te salvas de este humilladero.",
    "Hoy no cenas, te alimentas de mi desprecio.",
    "¡Vaya puta mierda de equipo! Un respeto al balón, cabrón.",
    "Tu cara de gilipollas derrotado es mi nuevo fondo de pantalla.",
    "¿Dónde está tu equipo? Yo solo veo conos y payasos.",
    "Te han puesto el culo como la bandera de Japón.",
    "Eres el saco de boxeo preferido de la comunidad.",
    "¡HUMILLADO! Si tuviera dignidad me moriría ahora mismo de asco.",
    "Vete a llorar a la llorería, paquete integral."
];

const SCENES = [
    'throne',       // Winner on top of loser
    'burial',       // Loser in coffin/ground
    'spanking',     // Physical "lesson"
    'shame',        // Pointing and laughing
    'clown',        // Loser with clown nose/wig
    'trash',        // Loser in a trash can
    'baby',         // Loser as a baby crying
    'toilet',       // Loser being "flushed"
    'kneel',        // Loser kneeling before winner
    'jail',         // Loser behind bars
    'pig'           // Loser as a pig
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
                        <div className="pres-hair"></div>
                        {type === 'winner' ? '😆' :
                            (scene === 'clown' && type === 'loser' ? '🤡' :
                                (scene === 'baby' && type === 'loser' ? '👶' :
                                    (scene === 'pig' && type === 'loser' ? '🐷' : '😭')))}
                    </div>
                </div>

                <div className="pres-neck"></div>

                <div className="pres-body" style={{ backgroundColor: color }}>
                    <div className="pres-shield-container">
                        <img src={getTeamShield(teamName)} alt="" className="pres-shield-mini" />
                    </div>
                    <div className="label-on-shirt">{teamName.substring(0, 10)}</div>
                </div>

                {scene !== 'toilet' && scene !== 'trash' && scene !== 'pig' && (
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
                                        {scene === 'jail' && <div className="jail-bars">⛓️</div>}

                                        <div className="action-ribbon">
                                            {scene === 'throne' && "EL REY DE LOS PAQUETES"}
                                            {scene === 'burial' && "DEP PRINGAO"}
                                            {scene === 'spanking' && "ZASCA MONUMENTAL"}
                                            {scene === 'clown' && "MENUDO PAYASO"}
                                            {scene === 'trash' && "DERECHO A LA BASURA"}
                                            {scene === 'baby' && "A BUSCAR EL CHUPETE"}
                                            {scene === 'toilet' && "UN RESULTADO DE MIERDA"}
                                            {scene === 'shame' && "HUMILLADO EN PÚBLICO"}
                                            {scene === 'kneel' && "ARRODÍLLATE ANTE TU PADRE"}
                                            {scene === 'jail' && "A LA CÁRCEL DE MALOS"}
                                            {scene === 'pig' && "ERES UN CERDO JUGANDO"}
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="cromo-footer">
                                <div className="cromo-score-row">
                                    <span className="team-n home">{match.homeTeam}</span>
                                    <span className="final-nums">{homeScore} - {awayScore}</span>
                                    <span className="team-n away">{match.awayTeam}</span>
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
