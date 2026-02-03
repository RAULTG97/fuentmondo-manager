import React from 'react';
import { motion } from 'framer-motion';
import {
    Swords, Table, Trophy, Users, AlertOctagon,
    Ban, LayoutGrid, Calendar, Award, ShieldAlert, Activity
} from 'lucide-react';
import './BottomNav.css';

const navItems = [
    { id: 'matchups', label: 'Partidos', icon: Activity, mode: 'league' },
    { id: 'standings', label: 'Tabla', icon: Table, mode: 'league' },
    { id: 'calendar', label: 'Calendario', icon: Calendar, mode: 'league' },
    { id: 'copa', label: 'Copa Piraña', icon: Trophy, mode: 'cup' },
    { id: 'teams', label: 'Equipos', icon: LayoutGrid },
    { id: 'captains', label: 'Capitanes', icon: Trophy },
    { id: 'sanctions', label: 'Sanciones', icon: Users },
    { id: 'infractions', label: 'Infracciones', icon: AlertOctagon, hideInCup: true },
    { id: 'restricted', label: 'Sancionados', icon: Ban, hideInCup: true },
    { id: 'hall_of_fame', label: 'FAMA', icon: Award },
];

const BottomNav = ({ activeTab, onTabChange, championship }) => {
    const navRef = React.useRef(null);
    const isCupMode = championship?.type === 'copa';

    // Auto-scroll active item into view
    React.useEffect(() => {
        if (navRef.current) {
            const activeItem = navRef.current.querySelector('.nav-item.active');
            if (activeItem) {
                activeItem.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }
        }
    }, [activeTab]);

    const filteredItems = navItems.filter(item => {
        if (item.mode === 'cup' && !isCupMode) return false;
        if (item.mode === 'league' && isCupMode) return false;
        if (isCupMode && item.hideInCup) return false;
        return true;
    });

    return (
        <nav className="bottom-nav">
            <div className="bottom-nav-container" ref={navRef}>
                {filteredItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                        <button
                            key={item.id}
                            className={`nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => onTabChange(item.id)}
                        >
                            <div className="nav-icon-wrapper">
                                <Icon size={20} />
                                {isActive && (
                                    <motion.div
                                        layoutId="nav-glow"
                                        className="nav-glow"
                                        initial={false}
                                        transition={{
                                            type: "spring",
                                            stiffness: 380,
                                            damping: 30
                                        }}
                                    />
                                )}
                            </div>
                            <span className="nav-label">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;
