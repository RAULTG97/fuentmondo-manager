import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Swords, Table, Trophy, Users, AlertOctagon,
    Ban, LayoutGrid, ChevronLeft, ChevronRight, Menu, Award
} from 'lucide-react';
import { APP_LOGO } from '../utils/assets';
import './Sidebar.css';

const navItems = [
    { id: 'matchups', label: 'Enfrentamientos', icon: Swords, mode: 'league' },
    { id: 'standings', label: 'Clasificación', icon: Table, mode: 'league' },
    { id: 'copa', label: 'Copa Piraña', icon: Trophy, mode: 'cup' },
    { id: 'teams', label: 'Equipos', icon: LayoutGrid },
    { id: 'captains', label: 'Capitanes', icon: Trophy },
    { id: 'sanctions', label: 'Sanciones', icon: Users },
    { id: 'infractions', label: 'Infracciones', icon: AlertOctagon },
    { id: 'restricted', label: 'Sancionados', icon: Ban },
    { id: 'hall_of_fame', label: 'HALL OF FAME', icon: Award },
];

function Sidebar({ activeTab, onTabChange, isCollapsed, onToggle, championship, championships, onChampionshipChange }) {
    const [showMore, setShowMore] = useState(false);
    const isCupMode = championship?.type === 'copa';

    const filteredItems = navItems.filter(item => {
        if (item.mode === 'cup' && !isCupMode) return false;
        if (item.mode === 'league' && isCupMode) return false;
        return true;
    });

    // Mobile primary items (first 4)
    const mobilePrimary = filteredItems.slice(0, 4);
    const mobileSecondary = filteredItems.slice(4);

    const handleTabClick = (id) => {
        onTabChange(id);
        setShowMore(false);
    };

    return (
        <motion.aside
            className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}
            initial={false}
            animate={{ width: window.innerWidth <= 768 ? '100%' : (isCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)') }}
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
                            Fuentmondo
                        </motion.span>
                    )}
                </div>
            </div>

            <nav className="sidebar-nav">
                <div className="mobile-nav-container">
                    {(window.innerWidth <= 768 ? mobilePrimary : filteredItems).map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;

                        return (
                            <button
                                key={item.id}
                                onClick={() => handleTabClick(item.id)}
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

                    {window.innerWidth <= 768 && (
                        <button
                            className={`nav-item ${showMore ? 'active' : ''}`}
                            onClick={() => setShowMore(!showMore)}
                        >
                            <div className="nav-icon-container">
                                <Menu size={20} />
                            </div>
                            <span className="nav-label">Más</span>
                        </button>
                    )}
                </div>

                <AnimatePresence>
                    {showMore && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="mobile-more-menu"
                        >
                            <div className="more-menu-grid">
                                {mobileSecondary.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = activeTab === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => handleTabClick(item.id)}
                                            className={`more-menu-item ${isActive ? 'active' : ''}`}
                                        >
                                            <Icon size={20} />
                                            <span>{item.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

            <div className="sidebar-footer">
                <button className="collapse-btn" onClick={onToggle}>
                    {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    {!isCollapsed && <span>Ocultar menú</span>}
                </button>
            </div>
        </motion.aside>
    );
}

export default Sidebar;
