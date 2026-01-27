import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Swords,
    Table,
    Trophy,
    LayoutGrid,
    MoreHorizontal,
    X,
    Award,
    Users,
    AlertOctagon,
    Ban
} from 'lucide-react';
import './MobileNav.css';

const MobileNav = ({ activeTab, onTabChange, championship }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Determine if we are in Cup mode
    const isCupMode = championship?.type === 'copa';

    // Main navigation items (always visible on bottom bar)
    const mainItems = [
        { id: 'matchups', label: 'Partidos', icon: Swords, show: !isCupMode },
        { id: 'standings', label: 'Clasific.', icon: Table, show: !isCupMode },
        { id: 'copa', label: 'Copa', icon: Trophy, show: true }, // Always show Copa
        { id: 'teams', label: 'Equipos', icon: LayoutGrid, show: true },
    ].filter(item => item.show).slice(0, 4); // Ensure max 4 items

    // Secondary items (hidden in "More" menu)
    const menuItems = [
        { id: 'captains', label: 'Capitanes', icon: Trophy },
        { id: 'sanctions', label: 'Sanciones', icon: Users },
        { id: 'infractions', label: 'Infracciones', icon: AlertOctagon },
        { id: 'restricted', label: 'Sancionados', icon: Ban },
        { id: 'hall_of_fame', label: 'Hall of Fame', icon: Award },
    ];

    const handleTabClick = (id) => {
        onTabChange(id);
        setIsMenuOpen(false);
    };

    return (
        <>
            {/* Bottom Navigation Bar */}
            <div className="mobile-nav-bar">
                {mainItems.map((item) => {
                    const isActive = activeTab === item.id;
                    const Icon = item.icon;

                    return (
                        <button
                            key={item.id}
                            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => handleTabClick(item.id)}
                        >
                            <div className="mobile-icon-wrapper">
                                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                                {isActive && (
                                    <motion.div
                                        className="mobile-active-dot"
                                        layoutId="mobile-nav-dot"
                                    />
                                )}
                            </div>
                            <span className="mobile-label">{item.label}</span>
                        </button>
                    );
                })}

                <button
                    className={`mobile-nav-item ${isMenuOpen ? 'active' : ''}`}
                    onClick={() => setIsMenuOpen(true)}
                >
                    <div className="mobile-icon-wrapper">
                        <MoreHorizontal size={24} />
                    </div>
                    <span className="mobile-label">Menú</span>
                </button>
            </div>

            {/* Full Screen Menu Drawer */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        className="mobile-menu-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMenuOpen(false)}
                    >
                        <motion.div
                            className="mobile-menu-drawer"
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="mobile-menu-header">
                                <h3>Más Opciones</h3>
                                <button className="close-btn" onClick={() => setIsMenuOpen(false)}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="mobile-menu-grid">
                                {menuItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = activeTab === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            className={`menu-grid-item ${isActive ? 'active' : ''}`}
                                            onClick={() => handleTabClick(item.id)}
                                        >
                                            <div className="menu-icon-box">
                                                <Icon size={24} />
                                            </div>
                                            <span>{item.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default MobileNav;
