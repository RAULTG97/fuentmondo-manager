import React, { useEffect, useState } from 'react';
import './Confetti.css';

const COLORS = ['#FFD700', '#FF4500', '#00BFFF', '#32CD32', '#FF69B4', '#9370DB'];

const Confetti = ({ active = false }) => {
    const [pieces, setPieces] = useState([]);

    useEffect(() => {
        if (active) {
            const count = 50;
            const newPieces = Array.from({ length: count }).map((_, i) => ({
                id: i,
                left: Math.random() * 100 + '%',
                animationDelay: Math.random() * 2 + 's',
                backgroundColor: COLORS[Math.floor(Math.random() * COLORS.length)],
                animationDuration: Math.random() * 2 + 2 + 's' // 2-4s
            }));
            setPieces(newPieces);
        } else {
            setPieces([]);
        }
    }, [active]);

    if (!active) return null;

    return (
        <div className="confetti-container">
            {pieces.map(p => (
                <div
                    key={p.id}
                    className="confetti-piece"
                    style={{
                        left: p.left,
                        backgroundColor: p.backgroundColor,
                        animation: `confetti-fall ${p.animationDuration} linear ${p.animationDelay} infinite`
                    }}
                />
            ))}
        </div>
    );
};

export default Confetti;
