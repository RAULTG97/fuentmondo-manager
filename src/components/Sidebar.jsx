import { motion } from 'framer-motion';
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
    const isCupMode = championship?.type === 'copa';

    const filteredItems = navItems.filter(item => {
        if (item.mode === 'cup' && !isCupMode) return false;
        if (item.mode === 'league' && isCupMode) return false;
        return true;
    });

    return (
        <motion.aside
            className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}
            initial={false}
            animate={{ width: isCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)' }}
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
                            className="sidebar-title"
                        >
                            Fuentmondo<span>Manager</span>
                        </motion.span>
                    )}
                </div>

            </div>

            <nav className="sidebar-nav">
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
                            <div className="nav-icon-container">
                                <Icon size={20} />
                                {isActive && (
                                    <motion.div
                                        layoutId="active-glow"
                                        className="nav-icon-glow"
                                    />
                                )}
                            </div>
                            {!isCollapsed && (
                                <span className="nav-label">{item.label}</span>
                            )}

                            {isActive && !isCollapsed && (
                                <motion.div
                                    layoutId="active-indicator"
                                    className="active-indicator"
                                />
                            )}
                        </button>
                    );
                })}
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
