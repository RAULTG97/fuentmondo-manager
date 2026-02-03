import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_LOGO, INTRO_CHAMPIONS, INTRO_LIGA_ML, INTRO_COPA } from '../utils/assets';
import './WelcomeScreen.css';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15,
            delayChildren: 0.3
        }
    },
    exit: {
        opacity: 0,
        scale: 1.1,
        filter: 'blur(10px)',
        transition: { duration: 0.5, ease: 'easeInOut' }
    }
};

const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: { type: 'spring', damping: 20, stiffness: 100 }
    }
};

const WelcomeScreen = ({ championships, onSelect }) => {
    const competitions = [
        {
            id: 'champions',
            title: '1ª DIVISIÓN',
            subtitle: 'CHAMPIONS FUENTMONDO',
            logo: INTRO_CHAMPIONS,
            searchKey: 'CHAMPIONS'
        },
        {
            id: 'monos-locos',
            title: '2ª DIVISIÓN',
            subtitle: 'MONOS LOCOS LEAGUE',
            logo: INTRO_LIGA_ML,
            searchKey: 'LA LIGA ML'
        },
        {
            id: 'copa',
            title: 'TORNEO DEL KO',
            subtitle: 'COPA PIRAÑA',
            logo: INTRO_COPA,
            searchKey: 'COPA PIRAÑA'
        }
    ];

    const handleSelect = (comp) => {
        const found = championships.find(c =>
            c.name.toUpperCase().includes(comp.searchKey)
        ) || championships[0];

        if (found) {
            onSelect(found._id);
        }
    };

    return (
        <motion.div
            className="welcome-screen"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
        >
            {/* Ambient Background Elements */}
            <div className="bg-bubbles">
                <div className="bubble"></div>
                <div className="bubble"></div>
                <div className="bubble"></div>
            </div>

            <div className="welcome-content">
                <motion.header
                    className="welcome-header"
                    variants={itemVariants}
                >
                    <div className="logo-container">
                        <motion.img
                            src={APP_LOGO}
                            alt="Fuentmondo Logo"
                            className="main-logo"
                            animate={{
                                y: [0, -10, 0],
                                rotate: [0, 2, -2, 0]
                            }}
                            transition={{
                                duration: 6,
                                repeat: Infinity,
                                ease: "linear"
                            }}
                        />
                    </div>
                    <h1 className="main-title">FUENTMONDO MANAGER</h1>
                </motion.header>

                <motion.div className="competition-selector" variants={containerVariants}>
                    {competitions.map((comp) => (
                        <motion.button
                            key={comp.id}
                            className="comp-card"
                            onClick={() => handleSelect(comp)}
                            variants={itemVariants}
                            whileHover={{
                                scale: 1.05,
                                translateY: -10,
                                transition: { type: 'spring', stiffness: 400, damping: 10 }
                            }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <div className="comp-logo-box">
                                <img src={comp.logo} alt={comp.title} />
                            </div>
                            <div className="comp-info">
                                <span className="comp-title">{comp.title}</span>
                                <span className="comp-subtitle">{comp.subtitle}</span>
                            </div>
                            <div className="card-shine"></div>
                        </motion.button>
                    ))}
                </motion.div>

                <motion.footer
                    className="welcome-footer"
                    variants={itemVariants}
                >
                    <p>Selecciona tu competición para gestionar la victoria</p>
                </motion.footer>
            </div>
        </motion.div>
    );
};

export default WelcomeScreen;
