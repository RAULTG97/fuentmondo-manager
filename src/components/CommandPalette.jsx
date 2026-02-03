import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Compass, Users, Calendar, AlertCircle, Shield, X, Command } from 'lucide-react';
import './CommandPalette.css';

const COMMANDS = [
    { id: 'tab-dashboard', label: 'Ver Dashboard', icon: Compass, action: 'navigate', value: 'dashboard' },
    { id: 'tab-matchups', label: 'Ver Enfrentamientos', icon: Users, action: 'navigate', value: 'matchups' },
    { id: 'tab-standings', label: 'Ver Clasificación', icon: Shield, action: 'navigate', value: 'standings' },
    { id: 'tab-infractions', label: 'Ver Infracciones', icon: AlertCircle, action: 'navigate', value: 'infractions' },
    { id: 'tab-calendar', label: 'Explorar Calendario', icon: Calendar, action: 'navigate', value: 'calendar' },
];

function CommandPalette({
    isOpen,
    onClose,
    onNavigate,
    teams = [],
    onSelectTeam,
    rounds = [],
    onSelectRound
}) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                isOpen ? onClose() : null; // Close is handled by parent, but this is a safety
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const filteredItems = (query === '' ? COMMANDS : [
        ...COMMANDS.filter(c => c.label.toLowerCase().includes(query.toLowerCase())),
        ...teams.filter(t => t.name.toLowerCase().includes(query.toLowerCase()))
            .map(t => ({ id: `team-${t.id}`, label: `Equipo: ${t.name}`, icon: Shield, action: 'team', value: t })),
        ...rounds.filter(r => r.number.toString() === query)
            .map(r => ({ id: `round-${r.number}`, label: `Ir a Jornada ${r.number}`, icon: Calendar, action: 'round', value: r.number }))
    ]).slice(0, 8);

    const handleSelect = (item) => {
        if (item.action === 'navigate') {
            onNavigate(item.value);
        } else if (item.action === 'team') {
            onSelectTeam(item.value);
        } else if (item.action === 'round') {
            onSelectRound(item.value);
        }
        onClose();
    };

    const onKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(i => (i + 1) % filteredItems.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(i => (i - 1 + filteredItems.length) % filteredItems.length);
        } else if (e.key === 'Enter') {
            if (filteredItems[selectedIndex]) {
                handleSelect(filteredItems[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="command-palette-overlay" onClick={onClose}>
                    <motion.div
                        className="command-palette-modal"
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="command-palette-input-wrapper">
                            <Search className="search-icon" size={20} />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Busca equipos, jornadas o secciones... (Tab para navegar)"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onKeyDown={onKeyDown}
                            />
                            <div className="kbd-shortcut">
                                <Command size={12} />
                                <span>K</span>
                            </div>
                        </div>

                        <div className="command-palette-results">
                            {filteredItems.length > 0 ? (
                                filteredItems.map((item, index) => (
                                    <div
                                        key={item.id}
                                        className={`command-item ${index === selectedIndex ? 'selected' : ''}`}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                        onClick={() => handleSelect(item)}
                                    >
                                        <item.icon className="item-icon" size={18} />
                                        <span className="item-label">{item.label}</span>
                                        {index === selectedIndex && (
                                            <span className="item-hint">Enter</span>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="no-results">
                                    No se encontraron resultados para "{query}"
                                </div>
                            )}
                        </div>

                        <div className="command-palette-footer">
                            <div className="footer-tip">
                                <kbd>↑↓</kbd> Navegar
                                <kbd>Enter</kbd> Seleccionar
                                <kbd>Esc</kbd> Cerrar
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

export default CommandPalette;
