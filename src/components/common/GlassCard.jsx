import { motion } from 'framer-motion';

// We can use standard CSS modules or styled-components if available, 
// but since I see explicit CSS files, I should stick to that or inline.
// However, the prompt asked for a component. I'll make it a simple wrapper using framer-motion 
// and a class I'll define in index.css or a new file.

// Let's stick to the existing pattern: CSS file for the component.

// I will assume I need to create a css file for it or add to index.css.
// Actually, I can just use inline styles for the "glass" part to be flexible, 
// strictly using the variables I just defined.

const GlassCard = ({
    children,
    className = "",
    onClick,
    hoverEffect = false,
    delay = 0
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: delay, ease: [0.22, 1, 0.36, 1] }}
            className={`glass-card ${hoverEffect ? 'hover-effect' : ''} ${className}`}
            onClick={onClick}
            style={{
                background: 'var(--bg-card)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--glass-shadow)',
                overflow: 'hidden'
            }}
            whileHover={hoverEffect ? {
                y: -5,
                boxShadow: '0 20px 40px -5px rgba(0,0,0,0.4)',
                borderColor: 'var(--glass-highlight)'
            } : {}}
        >
            {children}
        </motion.div>
    );
};

export default GlassCard;
