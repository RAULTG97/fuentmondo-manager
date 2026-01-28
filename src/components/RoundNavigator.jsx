import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import './RoundNavigator.css';

function RoundNavigator({ currentRound, totalRounds = 38, onRoundChange, roundStatus, onReturnToCurrent }) {
    const handlePrevious = () => {
        if (currentRound > 1) {
            onRoundChange(currentRound - 1);
        }
    };

    const handleNext = () => {
        if (currentRound < totalRounds) {
            onRoundChange(currentRound + 1);
        }
    };

    const getStatusBadge = () => {
        switch (roundStatus) {
            case 'current':
                return { label: 'En Curso', className: 'status-current' };
            case 'past':
                return { label: 'Finalizada', className: 'status-past' };
            case 'future':
                return { label: 'Próxima', className: 'status-future' };
            case 'historical':
                return { label: 'Histórica', className: 'status-historical' };
            default:
                return { label: '', className: '' };
        }
    };

    const statusBadge = getStatusBadge();

    return (
        <div className="round-navigator">
            <motion.button
                className="nav-button prev"
                onClick={handlePrevious}
                disabled={currentRound <= 1}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <ChevronLeft size={20} />
                <span className="nav-label">Anterior</span>
            </motion.button>

            <div className="round-info-container">
                <div className="round-info">
                    <div className="round-number">
                        Jornada <span className="number-highlight">{currentRound}</span>
                    </div>
                    {statusBadge.label && (
                        <span className={`round-status ${statusBadge.className}`}>
                            {statusBadge.label}
                        </span>
                    )}
                </div>

                {onReturnToCurrent && (
                    <motion.button
                        className="return-button expanded"
                        onClick={onReturnToCurrent}
                        title="IR A ÚLTIMA JORNADA DISPUTADA"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <RotateCcw size={16} />
                        <span className="return-label">IR A ÚLTIMA JORNADA DISPUTADA</span>
                    </motion.button>
                )}
            </div>

            <motion.button
                className="nav-button next"
                onClick={handleNext}
                disabled={currentRound >= totalRounds}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <span className="nav-label">Siguiente</span>
                <ChevronRight size={20} />
            </motion.button>
        </div>
    );
}

export default RoundNavigator;
