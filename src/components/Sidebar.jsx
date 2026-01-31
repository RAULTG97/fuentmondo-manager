import { motion } from 'framer-motion';
import {
    Swords, Table, Trophy, Users, AlertOctagon,
    Ban, LayoutGrid, ChevronLeft, ChevronRight, Menu, Award, Calendar
} from 'lucide-react';
import { useRef, useEffect, useState } from 'react';
import { APP_LOGO } from '../utils/assets';
import './Sidebar.css';

const navItems = [
    { id: 'matchups', label: 'Enfrentamientos', icon: Swords, mode: 'league' },
    { id: 'standings', label: 'Clasificación', icon: Table, mode: 'league' },
    { id: 'calendar', label: 'Calendario', icon: Calendar, mode: 'league' },
    { id: 'copa', label: 'Copa Piraña', icon: Trophy, mode: 'cup' },
    { id: 'teams', label: 'Equipos', icon: LayoutGrid },
    { id: 'captains', label: 'Capitanes', icon: Trophy },
    { id: 'sanctions', label: 'Sanciones', icon: Users },
    { id: 'infractions', label: 'Infracciones', icon: AlertOctagon, hideInCup: true },
    { id: 'restricted', label: 'Sancionados', icon: Ban, hideInCup: true },
    { id: 'hall_of_fame', label: 'HALL OF FAME', icon: Award },
];

function Sidebar({ activeTab, onTabChange, isCollapsed, onToggle, championship, championships, onChampionshipChange }) {
    const isCupMode = championship?.type === 'copa';
    const navRef = useRef(null);

    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    // Update window width on resize
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Scroll active item into view on mobile
    useEffect(() => {
        if (windowWidth <= 768 && navRef.current) {
            const activeItem = navRef.current.querySelector('.nav-item.active');
            if (activeItem) {
                activeItem.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }
        }
    }, [activeTab, windowWidth]);

    const filteredItems = navItems.filter(item => {
        if (item.mode === 'cup' && !isCupMode) return false;
        if (item.mode === 'league' && isCupMode) return false;
        if (isCupMode && item.hideInCup) return false;
        return true;
    });

    return (
        <motion.aside
            className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}
            initial={false}
            animate={{ width: windowWidth <= 768 ? '100%' : (isCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)') }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
            <div className="sidebar-header">
                <div className="logo-section">
                    <div className="logo-glow">
                        <img src={APP_LOGO} alt="Logo" className="sidebar-logo" />
                    </div>
                    {!isCollapsed && (
                        <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="sidebar-title"
                        >
                            FUENTMONDO
                        </motion.span>
                    )}
                </div>

            </div>
            <div className="nav-container-mobile">
                <nav className="sidebar-nav" ref={navRef}>
                    {filteredItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;

                        return (
                            <button
                                key={item.id}
                                onClick={() => onTabChange(item.id)}
                                className={`nav-item ${isActive ? 'active' : ''}`}
                                title={isCollapsed ? item.label : ''}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="mobile-indicator"
                                        className="mobile-indicator"
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                )}

                                <div className="nav-icon-container">
                                    <Icon size={isActive ? 22 : 20} strokeWidth={isActive ? 2.5 : 2} />
                                    {isActive && (
                                        <motion.div
                                            layoutId="active-glow"
                                            className="nav-icon-glow"
                                            transition={{ duration: 0.2 }}
                                        />
                                    )}
                                </div>

                                <span className="nav-label">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            <div className="sidebar-footer">
                <button className="collapse-btn" onClick={onToggle}>
                    {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    {!isCollapsed && <span>Ocultar menú</span>}
                </button>
            </div>
        </motion.aside >
    );
}

export default Sidebar;
