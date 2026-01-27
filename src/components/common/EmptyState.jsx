import React from 'react';
import { motion } from 'framer-motion';
import { Box, Search } from 'lucide-react';

const EmptyState = ({
    icon: Icon = Box,
    title = "No se han encontrado resultados",
    description = "Intenta ajustar los filtros o selecciona otra jornada.",
    action = null
}) => {
    return (
        <motion.div
            className="flex-center flex-column glass-premium"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                padding: '4rem 2rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
                margin: '2rem auto',
                maxWidth: '600px'
            }}
        >
            <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                padding: '1.5rem',
                borderRadius: '50%',
                marginBottom: '1rem'
            }}>
                <Icon size={48} color="var(--primary)" />
            </div>
            <h3 style={{ fontSize: 'var(--font-xl)', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                {title}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-base)', maxWidth: '400px', lineHeight: '1.6' }}>
                {description}
            </p>
            {action && (
                <div style={{ marginTop: '1.5rem' }}>
                    {action}
                </div>
            )}
        </motion.div>
    );
};

export default EmptyState;
