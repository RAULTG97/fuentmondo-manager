import { motion } from 'framer-motion';
import {
    Swords, Table, Trophy, Users, AlertOctagon,
    Ban, LayoutGrid, ChevronLeft, ChevronRight, LogOut
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
            className={`sidebar glass ${isCollapsed ? 'collapsed' : ''}`}
            initial={false}
            animate={{ width: isCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
            <div className="sidebar-header">
                <div className="logo-section">
                    <img src={APP_LOGO} alt="Logo" className="sidebar-logo" />
                    {!isCollapsed && (
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="sidebar-title"
                        >
                            Fuentmondo<span>Manager</span>
                        </motion.span>
                    )}
                </div>

                {!isCollapsed && championships && championships.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="champ-selector-container"
                    >
                        <label className="sidebar-field-label">CAMPEONATO ACTIVO</label>
                        <div className="sidebar-select-wrapper">
                            <select
                                value={championship?._id}
                                onChange={(e) => onChampionshipChange(e.target.value)}
                                className="sidebar-select"
                            >
                                {championships.map(c => (
                                    <option key={c._id} value={c._id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </motion.div>
                )}

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
                            <div className="nav-icon">
                                <Icon size={22} />
                            </div>
                            {!isCollapsed && (
                                <motion.span
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="nav-label"
                                >
                                    {item.label}
                                </motion.span>
                            )}
                            {isActive && (
                                <motion.div
                                    layoutId="active-pill"
                                    className="active-pill"
                                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                />
                            )}
                        </button>
                    );
                })}
            </nav>

            <div className="sidebar-footer">
                <button className="collapse-toggle" onClick={onToggle}>
                    {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                </button>
            </div>
        </motion.aside>
    );
}

export default Sidebar;
