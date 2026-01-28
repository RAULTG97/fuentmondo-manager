import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const PremiumDropdown = ({
    label,
    value,
    options = [],
    onChange,
    icon: Icon,
    className = "",
    displayValue
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownRect, setDropdownRect] = useState(null);
    const triggerRef = useRef(null);

    const handleSelect = (optionValue) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    const toggleOpen = () => {
        if (!isOpen && triggerRef.current) {
            setDropdownRect(triggerRef.current.getBoundingClientRect());
        }
        setIsOpen(!isOpen);
    };

    useEffect(() => {
        const updateRect = () => {
            if (isOpen && triggerRef.current) {
                setDropdownRect(triggerRef.current.getBoundingClientRect());
            }
        };

        window.addEventListener('scroll', updateRect, true);
        window.addEventListener('resize', updateRect);

        return () => {
            window.removeEventListener('scroll', updateRect, true);
            window.removeEventListener('resize', updateRect);
        };
    }, [isOpen]);

    return (
        <>
            <div
                ref={triggerRef}
                className={`premium-selector ${className} ${isOpen ? 'active' : ''}`}
                onClick={toggleOpen}
                style={{ cursor: 'pointer', position: 'relative' }}
            >
                <div className="selector-icon">
                    <Icon size={18} />
                </div>

                <div className="selector-content">
                    <span className="selector-label">{label}</span>
                    <div className="current-value">
                        {displayValue || options.find(o => o.id === value)?.label || 'Seleccionar'}
                    </div>
                </div>

                <ChevronDown
                    size={14}
                    className="select-arrow"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}
                />
            </div>

            {createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <>
                            <motion.div
                                className="dropdown-overlay"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsOpen(false)}
                                style={{ zIndex: 9998 }}
                            />
                            {dropdownRect && (
                                <motion.div
                                    className="dropdown-menu portal-dropdown"
                                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                                    transition={{ duration: 0.15, ease: "easeOut" }}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        position: 'fixed',
                                        top: dropdownRect.bottom + 8,
                                        left: dropdownRect.left,
                                        width: dropdownRect.width,
                                        zIndex: 10000,
                                        pointerEvents: 'auto'
                                    }}
                                >
                                    <div className="dropdown-list">
                                        {options && options.length > 0 ? (
                                            options.map((option) => (
                                                <div
                                                    key={option.id}
                                                    className={`dropdown-item ${value === option.id ? 'selected' : ''}`}
                                                    onClick={() => handleSelect(option.id)}
                                                >
                                                    {option.label}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="dropdown-item" style={{ opacity: 0.5, cursor: 'default' }}>
                                                Sin opciones disponibles
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
};

export default PremiumDropdown;
