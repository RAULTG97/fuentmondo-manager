import React, { useRef, useMemo } from 'react';
import html2canvas from 'html2canvas';
import { Download, X, Laugh } from 'lucide-react';
import { getTeamShield } from '../utils/assets';
import './MatchShareCard.css';

// DYNAMIC CONTEXT-AWARE BANTER - ADULT RATED
const BANTER_TEMPLATES = [
    // Sex/Genitals/Insults
    (w, l) => `¡${w} se ha follado a ${l} sin condón y sin cariño!`,
    (w, l) => `${l} tiene el culo como un bebedero de patos tras el paso de ${w}.`,
    (w, l) => `Abre grande ${l}, que aquí viene la puntuación de ${w}.`,
    (w, l) => `La defensa de ${l} parecen monjas y ${w} es el actor porno.`,
    (w, l) => `¿Te duele ${l}? Eso es que ${w} la ha metido hasta el fondo.`,
    (w, l) => `Límpiate la lefa de la cara ${l}, que das pena.`,
    (w, l) => `${w} ha puesto a ${l} mirando a Cuenca. ¡Vaya viaje!`,
    (w, l) => `${l} es la puta barata de esta liga, y ${w} su chulo.`,
    (w, l) => `${l}, vete a comer pollas, que el fútbol no es lo tuyo.`,
    (w, l) => `Hazte un OnlyFans ${l}, porque en el campo solo das la risa.`,
    (w, l) => `¿Te gusta por detrás ${l}? Por el resultado parece que a ${w} sí.`,
    (w, l) => `Soy ${w}, tu padre, y vengo a castigarte, ${l}.`,
    (w, l) => `${w} te ha dejado el culo como la bandera de Japón, ${l}.`,
    (w, l) => `${l} es la perra sumisa de ${w}. ¡Ladra perra!`,

    // Scatological/Disgusting
    (w, l) => `${l} huele a mierda después del baño de ${w}.`,
    (w, l) => `${l} se ha cagado encima y ${w} no trae pañales.`,
    (w, l) => `${l} es un mojón con patas. Atentamente: ${w}.`,
    (w, l) => `Mírate ${l}, rebozado en tu propia inmundicia ante ${w}.`,
    (w, l) => `Das más asco que un baño de gasolinera, ${l}.`,
    (w, l) => `${w} se ha cagado en el pecho de ${l} y le ha gustado.`,

    // Intelligence/Ability
    (w, l) => `${l} es tonto hasta para almorzar. ${w} lo sabe.`,
    (w, l) => `Si ${l} fuera más inútil, sería una piedra.`,
    (w, l) => `La estrategia de ${l} la diseñó un mono con alzhéimer.`,
    (w, l) => `Retírate ${l}, estás robando oxígeno a ${w}.`,
    (w, l) => `${l} da vergüenza a su familia y a su escudo.`,

    // Aggressive/Violent
    (w, l) => `${w} le ha pisado la cabeza a ${l} y ha bailado encima.`,
    (w, l) => `${w} ha venido a arrancarle la piel a tiras a ${l}.`,
    (w, l) => `Estás muerto y enterrado, gusano de ${l}.`,
    (w, l) => `Pide perdón por existir, basura de ${l}.`,
    (w, l) => `¡${l}, arrodíllate y bésale los pies a ${w}!`,
    (w, l) => `${w} te va a usar de alfombra para limpiarse los tacos.`,

    // Classic Troll / Specific
    (w, l) => `GAME OVER ${l}. Insert Coin in your ass.`,
    (w, l) => `A llorar a la llorería ${l}, bebecito llorón.`,
    (w, l) => `¿${l} iba de campeón? Iba de payaso frente a ${w}.`,
    (w, l) => `Vendido por cuatro duros, mercenario manco de ${l}.`,
    (w, l) => `${l} duerme caliente... de la hostia que se ha llevado de ${w}.`
];

const SCENES = [
    'fuck', 'piss', 'whip', 'slave', 'grave', 'nelson', 'spanking', 'trash', 'cum', 'kneel', 'foot',
    'teabag', 'doggy', '69_fail', ' vomit'
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
        const template = BANTER_TEMPLATES[Math.floor(Math.random() * BANTER_TEMPLATES.length)];

        const wName = isHomeWinner ? match.homeTeam : (isAwayWinner ? match.awayTeam : "Nadie");
        const lName = isHomeWinner ? match.awayTeam : (isAwayWinner ? match.homeTeam : "Nadie");

        // Truncate names if too long for the meme text
        const w = wName.length > 20 ? wName.substring(0, 18) + '.' : wName;
        const l = lName.length > 20 ? lName.substring(0, 18) + '.' : lName;

        const randomMessage = isDraw
            ? "¡Empate de mancos! Aburrimiento total..."
            : template(w, l);

        const trollIcons = ['🤡', '💩', '🤮', '🤣', '🤫', '💀', '🤏', '🔥'];
        return {
            scene: randomScene,
            message: randomMessage,
            trollIcon: trollIcons[Math.floor(Math.random() * trollIcons.length)]
        };
    }, [isHomeWinner, isAwayWinner, match, isDraw]);

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
            link.download = `CRONICA_${match.homeTeam}_vs_${match.awayTeam}.png`;
            link.click();
        } catch (error) {
            console.error('Error generating image:', error);
        }
    };

    const PresidentAvatar = ({ type, isHome, pose = 'standing', expression = 'neutral' }) => {
        const teamName = isHome ? match.homeTeam : match.awayTeam;
        const color = isHome ? '#3b82f6' : '#ef4444';

        // Randomize features slightly
        const skinTone = useMemo(() => ['#ffdbac', '#e0ac69', '#f1c27d', '#8d5524'][Math.floor(Math.random() * 4)], []);
        const hairStyle = useMemo(() => Math.floor(Math.random() * 4) + 1, []); // 1-4

        return (
            <div className={`president-avatar ${type} ${isHome ? 'home-pres' : 'away-pres'} pose-${pose}`}>
                {/* HEAD AREA */}
                <div className="avatar-head-group">
                    {type === 'winner' && <div className="avatar-crown">👑</div>}
                    <div className="avatar-head" style={{ backgroundColor: skinTone }}>
                        {/* Hair */}
                        <div className={`avatar-hair style-${hairStyle}`}></div>

                        {/* Face */}
                        <div className="avatar-face">
                            <div className="avatar-brows">
                                <div className={`brow left ${expression}`}></div>
                                <div className={`brow right ${expression}`}></div>
                            </div>
                            <div className="avatar-eyes">
                                <div className={`eye left ${expression}`}></div>
                                <div className={`eye right ${expression}`}></div>
                            </div>
                            <div className="avatar-nose"></div>
                            <div className={`avatar-mouth ${expression}`}>
                                {expression === 'laughing' && <div className="tongue"></div>}
                                {expression === 'crying' && <div className="tears"></div>}
                                {expression === 'dead' && <div className="dead-tongue"></div>}
                            </div>
                        </div>

                        {/* Ears */}
                        <div className="avatar-ear left" style={{ backgroundColor: skinTone }}></div>
                        <div className="avatar-ear right" style={{ backgroundColor: skinTone }}></div>
                    </div>
                </div>

                {/* BODY AREA */}
                <div className="avatar-body-group">
                    <div className="avatar-neck" style={{ backgroundColor: skinTone }}></div>

                    {/* Torso/Jersey */}
                    <div className="avatar-torso" style={{ backgroundColor: color }}>
                        <div className="jersey-pattern"></div>
                        <div className="jersey-shield-box">
                            <img src={getTeamShield(teamName)} alt="" className="jersey-shield" />
                        </div>
                    </div>

                    {/* Arms */}
                    <div className="avatar-arm left" style={{ backgroundColor: color }}>
                        <div className="avatar-hand" style={{ backgroundColor: skinTone }}></div>
                        {type === 'winner' && scene === 'whip' && <div className="prop-whip">🏏</div>}
                    </div>
                    <div className="avatar-arm right" style={{ backgroundColor: color }}>
                        <div className="avatar-hand" style={{ backgroundColor: skinTone }}></div>
                        {/* Interactive props based on scene */}
                        {type === 'winner' && scene === 'piss' && <div className="prop-stream"></div>}
                    </div>
                </div>

                {/* LEGS AREA */}
                {scene !== 'trash' && (
                    <div className="avatar-legs-group">
                        <div className="avatar-leg left" style={{ backgroundColor: color }}>
                            <div className="avatar-shoe"></div>
                        </div>
                        <div className="avatar-leg right" style={{ backgroundColor: color }}>
                            <div className="avatar-shoe"></div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="share-modal-overlay modal-overlay" onClick={onClose}>
            <div className="share-modal-container modal-content-animate" onClick={e => e.stopPropagation()}>
                <div className="share-modal-header">
                    <h3>CRÓNICA PARTIDO</h3>
                    <button onClick={onClose} className="close-share"><X size={24} /></button>
                </div>

                <div className="card-preview-area">
                    <div className="cromo-card" ref={cardRef}>
                        <div className="cromo-inner">
                            <div className="cromo-header">
                                <span className="tournament-label">FUENTMONDO SEASON 25/26</span>
                                <div className="banter-bubble">"{message}"</div>
                            </div>

                            <div className={`caricature-stage scene-${scene} ${isHomeWinner ? 'home-wins' : isAwayWinner ? 'away-wins' : 'is-draw'}`}>
                                {isDraw ? (
                                    <div className="draw-scene">
                                        <PresidentAvatar type="neutral" isHome={true} pose="standing" expression="neutral" />
                                        <div className="draw-icon">😴</div>
                                        <PresidentAvatar type="neutral" isHome={false} pose="standing" expression="neutral" />
                                    </div>
                                ) : (
                                    <>
                                        {/* Winner Avatar */}
                                        <PresidentAvatar
                                            type={isHomeWinner ? 'winner' : 'loser'}
                                            isHome={true}
                                            pose={isHomeWinner ? 'standing' : (scene === 'kneel' || scene === 'slave' ? 'kneeling' : 'defeated')}
                                            expression={isHomeWinner ? 'laughing' : (scene === 'fuck' ? 'shame' : 'crying')}
                                        />

                                        {/* Loser Avatar */}
                                        <PresidentAvatar
                                            type={isAwayWinner ? 'winner' : 'loser'}
                                            isHome={false}
                                            pose={isAwayWinner ? 'standing' : (scene === 'kneel' || scene === 'slave' ? 'kneeling' : 'defeated')}
                                            expression={isAwayWinner ? 'laughing' : (scene === 'fuck' ? 'shame' : 'crying')}
                                        />

                                        <div className="winner-aura">{winnerEffect}</div>

                                        {scene === 'trash' && <div className="trash-can">🗑️</div>}
                                        {scene === 'grave' && <div className="grave-stone">RIP</div>}
                                        {scene === 'jail' && <div className="jail-bars">⛓️</div>}
                                        {scene === 'whip' && <div className="prop-whip-effect">💥</div>}
                                        {scene === 'piss' && <div className="piss-puddle"></div>}
                                        {scene === 'cum' && <div className="rain-effect">💦</div>}

                                        <div className="action-ribbon">
                                            {scene === 'fuck' && "TE HE DADO POR CULO"}
                                            {scene === 'piss' && "ME MEO EN TU EQUIPO"}
                                            {scene === 'whip' && "A LATIGAZOS APRENDES"}
                                            {scene === 'slave' && "ERES MI PUTA MASCOTA"}
                                            {scene === 'grave' && "AQUÍ YACE TU DIGNIDAD"}
                                            {scene === 'nelson' && "¡HA-HA! PRINGAO"}
                                            {scene === 'spanking' && "NALGADAS DE CASTIGO"}
                                            {scene === 'trash' && "TU LUGAR ES LA BASURA"}
                                            {scene === 'cum' && "LLUVIA DORADA PARA TI"}
                                            {scene === 'kneel' && "CHUPA Y CALLA"}
                                            {scene === 'foot' && "BESA MI SUELA"}
                                            {scene === 'teabag' && "COMETE MIS HUEVOS"}
                                            {scene === 'doggy' && "A CUATRO PATAS, PERRA"}
                                            {scene === 'vomit' && "ME DAS GANAS DE VOMITAR"}
                                            {scene === '69_fail' && "CHUPAMELA MIENTRAS LLORAS"}
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
                            </div>
                        </div>
                    </div>
                </div>

                <div className="share-actions">
                    <button className="download-btn-troll" onClick={exportImage}>
                        <Laugh size={24} className="meme-icon-spin" />
                        DESCARGAR MEME
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MatchShareCard;
