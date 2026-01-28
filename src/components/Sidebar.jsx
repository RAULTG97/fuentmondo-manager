import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Swords, Table, Trophy, Users, AlertOctagon,
    Ban, LayoutGrid, ChevronLeft, ChevronRight, Menu, Award
} from 'lucide-react';
import { APP_LOGO } from '../utils/assets';
import './Sidebar.css';

const navItems = [
    { id: 'matchups', label: 'Enfrentamientos', shortLabel: 'Partidos', icon: Swords, mode: 'league' },
    { id: 'standings', label: 'Clasificación', shortLabel: 'Tabla', icon: Table, mode: 'league' },
    { id: 'copa', label: 'Copa Piraña', shortLabel: 'Copa', icon: Trophy },
    { id: 'teams', label: 'Equipos', shortLabel: 'Equipos', icon: LayoutGrid },
    { id: 'captains', label: 'Capitanes', shortLabel: 'Capitanes', icon: Trophy },
    { id: 'sanctions', label: 'Sanciones', icon: Users },
    { id: 'infractions', label: 'Infracciones', icon: AlertOctagon },
    { id: 'restricted', label: 'Sancionados', icon: Ban },
    { id: 'hall_of_fame', label: 'HALL OF FAME', shortLabel: 'H.O.F', icon: Award },
];

function Sidebar({ activeTab, onTabChange, isCollapsed, onToggle, championship }) {
    const [isMobile, setIsMobile] = useState(false);
    const [showMore, setShowMore] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const isCupMode = championship?.type === 'copa' || championship?.mode === 'cup';

    const filteredItems = navItems.filter(item => {
        if (isCupMode) {
            // In cup mode, normally matchups/standings are handled differently or not needed
            if (item.id === 'matchups' || item.id === 'standings') return false;
        }
        return true;
    });

    const getMobilePrimary = () => {
        const primaryIds = ['matchups', 'standings', 'copa', 'teams'];
        const items = filteredItems.filter(item => primaryIds.includes(item.id));
        return items.sort((a, b) => primaryIds.indexOf(a.id) - primaryIds.indexOf(b.id));
    };

    const mobilePrimary = isMobile ? getMobilePrimary() : [];
    const mobileSecondary = isMobile ? filteredItems.filter(item => !mobilePrimary.find(p => p.id === item.id)) : [];

    const handleTabClick = (id) => {
        onTabChange(id);
        setShowMore(false);
    };

    return (
        <>
            <motion.aside
                className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}
                initial={false}
                animate={{ width: isMobile ? '100%' : (isCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)') }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
                <div className="sidebar-header">
                    <div className="logo-section">
                        <div className="logo-glow">
                            <img src={APP_LOGO} alt="Logo" className="sidebar-logo" />
                        </div>
                        {!isCollapsed && !isMobile && (
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
                        {(isMobile ? mobilePrimary : filteredItems).map((item) => {
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

                                    <span className="nav-label">{item.shortLabel || item.label}</span>
                                </button>
                            );
                        })}

                        {isMobile && mobileSecondary.length > 0 && (
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
                </nav>

                <div className="sidebar-footer">
                    <button className="collapse-btn" onClick={onToggle}>
                        {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                        {!isCollapsed && <span>Ocultar menú</span>}
                    </button>
                </div>
            </motion.aside>

            {/* Render "More" Menu outside sidebar to avoid clipping issues */}
            <AnimatePresence>
                {isMobile && showMore && createPortal(
                    <div className="mobile-more-overlay" onClick={() => setShowMore(false)}>
                        <motion.div
                            initial={{ opacity: 0, y: 100 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 100 }}
                            className="mobile-more-menu"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="more-menu-header">
                                <h3>Más secciones</h3>
                                <button className="close-more" onClick={() => setShowMore(false)}>×</button>
                            </div>
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
                                            <Icon size={24} />
                                            <span>{item.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </div>,
                    document.body
                )}
            </AnimatePresence>
        </>
    );
}

export default Sidebar;
