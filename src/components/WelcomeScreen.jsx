import React, { useState } from 'react';
import { APP_LOGO, INTRO_CHAMPIONS, INTRO_LIGA_ML, INTRO_COPA } from '../utils/assets';
import './WelcomeScreen.css';

const WelcomeScreen = ({ championships, onSelect }) => {
    const [isExiting, setIsExiting] = useState(false);

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
            setIsExiting(true);
            setTimeout(() => {
                onSelect(found._id);
            }, 800); // Wait for transition
        }
    };

    return (
        <div className={`welcome-screen ${isExiting ? 'exit-active' : ''}`}>
            {/* Animated Background Elements */}
            <div className="bg-glow-1"></div>
            <div className="bg-glow-2"></div>

            <div className="welcome-content">
                <header className="welcome-header">
                    <div className="logo-container">
                        <img src={APP_LOGO} alt="Fuentmondo Logo" className="main-logo" />
                    </div>
                    <h1 className="main-title">FUENTMONDO MANAGER</h1>
                </header>

                <div className="competition-selector">
                    {competitions.map((comp) => (
                        <button
                            key={comp.id}
                            className="comp-card"
                            onClick={() => handleSelect(comp)}
                        >
                            <div className="comp-logo-box">
                                <img src={comp.logo} alt={comp.title} />
                            </div>
                            <div className="comp-info">
                                <span className="comp-title">{comp.title}</span>
                                <span className="comp-subtitle">{comp.subtitle}</span>
                            </div>
                            <div className="card-hover-effect"></div>
                        </button>
                    ))}
                </div>

                <footer className="welcome-footer">
                    <p>Selecciona tu competición para entrar al Dashboard</p>
                </footer>
            </div>
        </div>
    );
};

export default WelcomeScreen;
